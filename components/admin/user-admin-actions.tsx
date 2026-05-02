'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface UserAdminActionsProps {
  userId: string
  isAdmin: boolean
  isSelf: boolean
}

export function UserAdminActions({ userId, isAdmin, isSelf }: UserAdminActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggleAdmin() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !isAdmin }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed')
      }
      toast.success(isAdmin ? 'Admin rights removed' : 'Admin rights granted')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading || isSelf}
      onClick={toggleAdmin}
      title={isSelf ? 'Cannot change your own admin status' : isAdmin ? 'Remove admin' : 'Grant admin'}
      className={isAdmin ? 'text-primary' : 'text-muted-foreground'}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isAdmin ? (
        <ShieldCheck className="h-3.5 w-3.5" />
      ) : (
        <ShieldOff className="h-3.5 w-3.5" />
      )}
      <span>{isAdmin ? 'Admin' : 'User'}</span>
    </Button>
  )
}
