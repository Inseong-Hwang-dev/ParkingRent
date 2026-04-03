import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BookingActions } from './booking-actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { MapPin, Mail, Phone, MessageSquare, ExternalLink } from 'lucide-react'
import type { BookingStatus, PricingType, SpaceType } from '@/types/database'

export const metadata: Metadata = { title: 'Booking Detail' }

// ─── Label maps ───────────────────────────────────────────────────────────────

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

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  drive_away: 'Drive Away',
  lockup_garage: 'Lockup Garage',
  unsheltered: 'Unsheltered',
  sheltered: 'Sheltered',
  indoor_lot: 'Indoor Lot',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch booking with listing + both user profiles.
  // The `contact_visible_on_accepted_booking` RLS policy on public.users
  // automatically reveals email/phone when the booking is accepted.
  const { data: booking, error } = await supabase
    .from('booking_requests')
    .select(
      `*,
       listing:listings ( id, title, suburb, state, space_type, is_sold_out ),
       buyer:users!booking_requests_buyer_id_fkey ( id, full_name, email, phone, avatar_url ),
       seller:users!booking_requests_seller_id_fkey ( id, full_name, email, phone, avatar_url )`
    )
    .eq('id', id)
    .single()

  if (error || !booking) notFound()

  const isBuyer = user.id === booking.buyer_id
  const isSeller = user.id === booking.seller_id

  // Guard: only parties to the booking may view it
  if (!isBuyer && !isSeller) notFound()

  const role = isSeller ? 'seller' : 'buyer'
  const status = booking.status as BookingStatus

  type BookingUser = {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    avatar_url: string | null
  }

  const buyer = booking.buyer as BookingUser
  const seller = booking.seller as BookingUser
  const listing = booking.listing as {
    id: string
    title: string
    suburb: string
    state: string
    space_type: SpaceType
    is_sold_out: boolean
  } | null

  const isAccepted = status === 'accepted'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Booking request</p>
          <h1 className="text-xl font-bold leading-tight">
            {listing?.title ?? 'Listing'}
          </h1>
          {listing && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {listing.suburb}, {listing.state}
            </p>
          )}
        </div>
        <Badge variant={STATUS_VARIANTS[status]} className="text-sm px-3 py-1">
          {STATUS_LABELS[status]}
        </Badge>
      </div>

      {/* Listing summary card */}
      {listing && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="space-y-1">
              <p className="font-medium">{listing.title}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {SPACE_TYPE_LABELS[listing.space_type]}
                </Badge>
                <span>{listing.suburb}, {listing.state}</span>
                {listing.is_sold_out && (
                  <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                )}
              </div>
            </div>
            <Link
              href={`/listings/${listing.id}`}
              className="flex items-center gap-1 text-sm text-primary hover:underline shrink-0"
            >
              View listing
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Booking details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pricing</span>
              <span className="font-medium">{PRICING_LABELS[booking.pricing_type as PricingType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested</span>
              <span className="font-medium">{formatDate(booking.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your role</span>
              <span className="font-medium capitalize">{role === 'buyer' ? 'Renter' : 'Owner'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'pending' || (role === 'seller' && status === 'accepted') ? (
              <BookingActions
                bookingId={id}
                listingId={listing?.id ?? ''}
                status={status}
                role={role}
                isSoldOut={listing?.is_sold_out ?? false}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {status === 'accepted'
                  ? 'Booking accepted. Contact details are visible below.'
                  : status === 'declined'
                    ? 'This booking was declined.'
                    : 'This booking request was cancelled.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buyer's message */}
      {booking.message && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message from Renter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{booking.message}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Contact info – revealed when accepted via RLS */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">
          {isAccepted ? 'Contact Information' : 'Parties'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PartyCard
            user={buyer}
            label="Renter"
            showContact={isAccepted}
          />
          <PartyCard
            user={seller}
            label="Owner"
            showContact={isAccepted}
          />
        </div>

        {!isAccepted && (
          <p className="text-xs text-muted-foreground">
            Contact details are revealed once the booking is accepted.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── PartyCard ────────────────────────────────────────────────────────────────

type BookingUser = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
}

function PartyCard({
  user,
  label,
  showContact,
}: {
  user: BookingUser
  label: string
  showContact: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
            <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-sm">{user.full_name}</p>
          </div>
        </div>

        {showContact && (
          <div className="space-y-1.5 text-sm">
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {user.email}
              </a>
            )}
            {user.phone && (
              <a
                href={`tel:${user.phone}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {user.phone}
              </a>
            )}
            {!user.email && !user.phone && (
              <p className="text-muted-foreground text-xs">No contact details on file.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
