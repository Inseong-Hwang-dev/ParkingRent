'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NotificationType } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type Notification = {
  id: string
  type: NotificationType
  booking_id: string | null
  is_read: boolean
  created_at: string
}

const TYPE_LABELS: Record<NotificationType, string> = {
  booking_request: 'New booking request received',
  booking_accepted: 'Your booking request was accepted',
  booking_declined: 'Your booking request was declined',
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // 1. Get user and fetch initial notifications
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      fetchNotifications(user.id)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Subscribe to realtime inserts once userId is known
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as Notification
          setNotifications((prev) => [incoming, ...prev].slice(0, 15))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Mark unread as read when dropdown opens
  useEffect(() => {
    if (!open || !userId) return
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

    supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
      .then(() => {}) // fire-and-forget; optimistic already applied
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchNotifications(uid: string) {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, booking_id, is_read, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(15)

    if (data) setNotifications(data as Notification[])
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link
                href={n.booking_id ? `/bookings/${n.booking_id}` : '/bookings'}
                className="flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer"
              >
                <span className={`text-sm leading-snug ${!n.is_read ? 'font-medium' : ''}`}>
                  {TYPE_LABELS[n.type]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(n.created_at)}
                </span>
                {!n.is_read && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            </DropdownMenuItem>
          ))
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/bookings"
                className="justify-center text-sm text-muted-foreground py-2"
              >
                View all bookings
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
