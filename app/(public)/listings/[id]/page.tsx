import { notFound, permanentRedirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BookingRequestForm } from '@/components/bookings/booking-request-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, MapPin, Pencil } from 'lucide-react'
import type { SpaceType, VehicleType, FeatureType, PricingType } from '@/types/database'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://parkspace.com.au'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Label maps ───────────────────────────────────────────────────────────────

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  drive_away: 'Drive Away',
  lockup_garage: 'Lockup Garage',
  unsheltered: 'Unsheltered',
  sheltered: 'Sheltered',
  indoor_lot: 'Indoor Lot',
}

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: 'Motorcycle',
  small_car: 'Small Car',
  suv: 'SUV',
  van: 'Van',
  small_truck: 'Small Truck',
  large_truck: 'Large Truck',
}

const FEATURE_LABELS: Record<FeatureType, string> = {
  access_247: '24/7 Access',
  cctv: 'CCTV',
  disabled_access: 'Disabled Access',
  ev_charging: 'EV Charging',
  instant_booking: 'Instant Booking',
  security: 'Security Guard',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchListing(idOrSlug: string) {
  const supabase = await createClient()
  const base = supabase
    .from('listings')
    .select(
      `*, listing_photos ( id, url, sort_order ), listing_vehicles ( vehicle ), listing_features ( feature )`
    )
    .eq('is_active', true)

  const { data } = UUID_REGEX.test(idOrSlug)
    ? await base.eq('id', idOrSlug).single()
    : await base.eq('slug', idOrSlug).single()

  return data
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: idOrSlug } = await params
  const supabase = await createClient()

  const base = supabase
    .from('listings')
    .select('id, slug, title, suburb, state, description, listing_photos(url, sort_order)')

  const { data } = UUID_REGEX.test(idOrSlug)
    ? await base.eq('id', idOrSlug).single()
    : await base.eq('slug', idOrSlug).single()

  if (!data) return {}

  const fallbackDesc = `Parking space in ${data.suburb}, ${data.state}.`
  const rawDesc = data.description ?? fallbackDesc
  const description = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '…' : rawDesc

  const photos = [...(data.listing_photos ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )
  const ogImage = photos[0]?.url ?? null

  const title = `${data.title} – ${data.suburb}, ${data.state} | ParkSpace`
  const canonicalSlug = data.slug ?? data.id

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/listings/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/listings/${canonicalSlug}`,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idOrSlug } = await params
  const supabase = await createClient()

  // If a raw UUID is passed and the listing has a slug, redirect permanently.
  if (UUID_REGEX.test(idOrSlug)) {
    const { data: check } = await supabase
      .from('listings')
      .select('slug')
      .eq('id', idOrSlug)
      .eq('is_active', true)
      .single()

    if (check?.slug) {
      permanentRedirect(`/listings/${check.slug}`)
    }
  }

  const [listingData, sessionRes] = await Promise.all([
    fetchListing(idOrSlug),
    supabase.auth.getUser(),
  ])

  if (!listingData) notFound()

  const listing = listingData

  const { data: ownerRows } = await supabase.rpc('get_listing_owner_public', {
    p_owner_id: listing.owner_id,
  })
  const authUser = sessionRes.data.user
  const isOwner = authUser?.id === listing.owner_id
  const isAuthenticated = !!authUser

  const photos = [...listing.listing_photos].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )

  const availablePricing: { type: PricingType; price: number }[] = []
  if (listing.price_daily !== null) availablePricing.push({ type: 'daily', price: listing.price_daily })
  if (listing.price_weekly !== null)
    availablePricing.push({ type: 'weekly', price: listing.price_weekly })
  if (listing.price_monthly !== null)
    availablePricing.push({ type: 'monthly', price: listing.price_monthly })

  const owner = ownerRows?.[0] ?? {
    id: listing.owner_id,
    full_name: 'Host',
    avatar_url: null as string | null,
  }

  const ownerInitials = owner.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const listingUrl = listing.slug ?? listing.id

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left / Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary">{SPACE_TYPE_LABELS[listing.space_type]}</Badge>
              {listing.is_sold_out && <Badge variant="destructive">Sold Out</Badge>}
              {isOwner && (
                <Button asChild size="sm" variant="outline" className="ml-auto gap-1.5">
                  <Link href={`/listings/${listing.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Listing
                  </Link>
                </Button>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {listing.suburb}, {listing.state} {listing.postcode}
            </p>
          </div>

          {/* Photo gallery */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {/* First photo large */}
              <div className={`relative ${photos.length === 1 ? 'col-span-2' : ''} aspect-[4/3] bg-muted`}>
                <Image
                  src={photos[0].url}
                  alt={`${listing.title} – photo 1`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
              </div>
              {/* Remaining photos */}
              {photos.slice(1, 5).map((photo: { id: string; url: string }, i: number) => (
                <div key={photo.id} className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={photo.url}
                    alt={`${listing.title} – photo ${i + 2}`}
                    fill
                    sizes="(max-width: 1024px) 50vw, 30vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
              No photos available
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="text-base font-semibold mb-1">About this space</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          <Separator />

          {/* Vehicle types */}
          {listing.listing_vehicles.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-2">Suitable vehicles</h2>
              <div className="flex flex-wrap gap-2">
                {listing.listing_vehicles.map(({ vehicle }: { vehicle: VehicleType }) => (
                  <Badge key={vehicle} variant="outline">
                    {VEHICLE_LABELS[vehicle]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {listing.listing_features.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-2">Features</h2>
              <div className="flex flex-wrap gap-2">
                {listing.listing_features.map(({ feature }: { feature: FeatureType }) => (
                  <Badge key={feature} variant="secondary">
                    {FEATURE_LABELS[feature]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Pricing table */}
          {availablePricing.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3">Pricing</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {availablePricing.map(({ type, price }) => (
                  <div key={type} className="rounded-lg border bg-muted/40 px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground capitalize mb-0.5">{type}</p>
                    <p className="text-xl font-bold">${price.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access instructions */}
          <div>
            <h2 className="text-base font-semibold mb-2">Access instructions</h2>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" />
              Revealed after booking is accepted.
            </div>
          </div>
        </div>

        {/* ── Right / Sticky column ── */}
        <div className="space-y-4">
          {/* Owner card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Listed by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={owner.avatar_url ?? undefined} alt={owner.full_name} />
                  <AvatarFallback>{ownerInitials}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{owner.full_name}</span>
              </div>
            </CardContent>
          </Card>

          {/* Booking card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {listing.is_sold_out ? 'Unavailable' : 'Request this space'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <BookingRequestForm
                  listingId={listing.id}
                  isSoldOut={listing.is_sold_out}
                  isOwner={isOwner}
                  availablePricing={availablePricing}
                />
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in to request this parking space.
                  </p>
                  <a
                    href={`/login?redirect=/listings/${listingUrl}`}
                    className="block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Sign in to book
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
