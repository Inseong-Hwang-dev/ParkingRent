import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import type { BookingStatus, PricingType } from '@/types/database'

export const metadata: Metadata = { title: 'Bookings' }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
}

const STATUS_VARIANTS: Record<BookingStatus, React.ComponentProps<typeof Badge>['variant']> = {
  pending: 'secondary',
  accepted: 'default',
  declined: 'destructive',
  cancelled: 'outline',
}

const PRICING_LABELS: Record<PricingType, string> = {
  daily: 'Daily',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { tab } = await searchParams
  const activeTab = tab === 'sent' ? 'sent' : 'received'

  const [receivedRes, sentRes] = await Promise.all([
    supabase
      .from('booking_requests')
      .select(
        `id, status, pricing_type, created_at,
         listing:listings ( id, title ),
         buyer:users!booking_requests_buyer_id_fkey ( full_name )`
      )
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }) as unknown as Promise<{
        data: Array<{
          id: string
          status: BookingStatus
          pricing_type: PricingType
          created_at: string
          listing: { id: string; title: string } | null
          buyer: { full_name: string } | null
        }> | null
      }>,

    supabase
      .from('booking_requests')
      .select(
        `id, status, pricing_type, created_at,
         listing:listings ( id, title ),
         seller:users!booking_requests_seller_id_fkey ( full_name )`
      )
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }) as unknown as Promise<{
        data: Array<{
          id: string
          status: BookingStatus
          pricing_type: PricingType
          created_at: string
          listing: { id: string; title: string } | null
          seller: { full_name: string } | null
        }> | null
      }>,
  ])

  const received = receivedRes.data ?? []
  const sent = sentRes.data ?? []

  const pendingReceivedCount = received.filter((b) => b.status === 'pending').length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>

      {/* Tab nav */}
      <div className="flex gap-1 border-b">
        <TabLink href="/bookings?tab=received" active={activeTab === 'received'}>
          Received
          {pendingReceivedCount > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground leading-none">
              {pendingReceivedCount}
            </span>
          )}
        </TabLink>
        <TabLink href="/bookings?tab=sent" active={activeTab === 'sent'}>
          Sent
        </TabLink>
      </div>

      {activeTab === 'received' ? (
        <BookingList
          bookings={received}
          emptyMessage="No booking requests received yet."
          role="seller"
        />
      ) : (
        <BookingList
          bookings={sent.map((b) => ({
            ...b,
            buyer: null,
            seller: 'seller' in b ? b.seller : null,
            otherParty: 'seller' in b ? (b.seller as { full_name: string } | null) : null,
          }))}
          emptyMessage="You haven't sent any booking requests yet."
          role="buyer"
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  )
}

type BookingRow = {
  id: string
  status: BookingStatus
  pricing_type: PricingType
  created_at: string
  listing: { id: string; title: string } | null
  buyer?: { full_name: string } | null
  otherParty?: { full_name: string } | null
  seller?: { full_name: string } | null
}

function BookingList({
  bookings,
  emptyMessage,
  role,
}: {
  bookings: BookingRow[]
  emptyMessage: string
  role: 'buyer' | 'seller'
}) {
  if (bookings.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mb-3 opacity-40" />
          <p className="font-medium">{emptyMessage}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="divide-y">
        {bookings.map((booking) => {
          const otherParty =
            role === 'seller'
              ? booking.buyer
              : booking.otherParty ?? booking.seller ?? null

          return (
            <li key={booking.id}>
              <Link
                href={`/bookings/${booking.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {booking.listing?.title ?? 'Listing'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {otherParty?.full_name ?? 'User'} &middot;{' '}
                    {PRICING_LABELS[booking.pricing_type]} &middot;{' '}
                    {formatDate(booking.created_at)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[booking.status]}>
                  {STATUS_LABELS[booking.status]}
                </Badge>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
