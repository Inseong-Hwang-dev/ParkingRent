import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Plus, Car } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingActions } from '@/components/listings/listing-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { SpaceType } from '@/types/database'

type MyListing = {
  id: string
  title: string
  suburb: string
  state: string
  space_type: SpaceType
  is_active: boolean
  is_sold_out: boolean
  price_daily: number | null
  price_fortnightly: number | null
  price_monthly: number | null
  listing_photos: { url: string; sort_order: number }[]
}

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  drive_away: 'Drive Away',
  lockup_garage: 'Lockup Garage',
  unsheltered: 'Unsheltered',
  sheltered: 'Sheltered',
  indoor_lot: 'Indoor Lot',
}

function formatPrice(listing: MyListing): string | null {
  if (listing.price_monthly) {
    return `$${listing.price_monthly.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`
  }
  if (listing.price_fortnightly) {
    return `$${listing.price_fortnightly.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/fn`
  }
  if (listing.price_daily) {
    return `$${listing.price_daily.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/day`
  }
  return null
}

export const metadata = { title: 'My Listings' }

export default async function MyListingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: listings } = await supabase
    .from('listings')
    .select(
      `
      id,
      title,
      suburb,
      state,
      space_type,
      is_active,
      is_sold_out,
      price_daily,
      price_fortnightly,
      price_monthly,
      listing_photos ( url, sort_order )
      `
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false }) as unknown as { data: MyListing[] | null }

  const myListings = listings ?? []

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {myListings.length === 0
              ? 'No listings yet.'
              : `${myListings.length} listing${myListings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button asChild className="gap-2 sm:shrink-0">
          <Link href="/listings/new">
            <Plus className="h-4 w-4" />
            Create New Listing
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {myListings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Car className="mx-auto h-10 w-10 mb-4 opacity-30" />
            <p className="font-medium text-base">You haven&apos;t listed any spaces yet</p>
            <p className="text-sm mt-1 mb-5">
              List your first parking space to start earning.
            </p>
            <Button asChild className="gap-2">
              <Link href="/listings/new">
                <Plus className="h-4 w-4" />
                Create New Listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Listings */}
      {myListings.length > 0 && (
        <div className="space-y-3">
          {myListings.map((listing) => {
            const coverPhoto = [...listing.listing_photos].sort(
              (a, b) => a.sort_order - b.sort_order
            )[0]
            const isPaused = !listing.is_active
            const price = formatPrice(listing)

            return (
              <Card key={listing.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-28 shrink-0 rounded-md overflow-hidden bg-muted">
                    {coverPhoto ? (
                      <Image
                        src={coverPhoto.url}
                        alt={listing.title}
                        fill
                        sizes="112px"
                        className={`object-cover transition-opacity ${isPaused ? 'opacity-40' : ''}`}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Car className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                    )}
                    {isPaused && (
                      <div className="absolute inset-0 bg-background/60" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isPaused ? 'text-muted-foreground' : ''}`}>
                      {listing.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {listing.suburb}, {listing.state} &middot; {SPACE_TYPE_LABELS[listing.space_type]}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isPaused ? (
                        <Badge variant="secondary" className="text-xs">Paused</Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                      {listing.is_sold_out && (
                        <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                      )}
                      {price && (
                        <span className="text-xs text-muted-foreground">{price}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0 sm:flex-row sm:items-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/listings/${listing.id}/edit`}>Edit</Link>
                    </Button>
                    <ListingActions
                      listingId={listing.id}
                      isActive={listing.is_active}
                      showDelete
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
