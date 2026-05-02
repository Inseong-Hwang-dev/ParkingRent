import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { SpaceType, VehicleType } from '@/types/database'

const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  drive_away: 'Drive Away',
  lockup_garage: 'Lockup Garage',
  unsheltered: 'Unsheltered',
  sheltered: 'Sheltered',
  indoor_lot: 'Indoor Lot',
}

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: 'Moto',
  small_car: 'Small Car',
  suv: 'SUV',
  van: 'Van',
  small_truck: 'Small Truck',
  large_truck: 'Large Truck',
}

interface ListingCardProps {
  listing: {
    id: string
    slug: string | null
    title: string
    suburb: string
    state: string
    space_type: SpaceType
    price_daily: number | null
    price_fortnightly: number | null
    price_monthly: number | null
    is_sold_out: boolean
    cover_photo: { url: string } | null
    listing_vehicles: { vehicle: VehicleType }[]
  }
}

function cheapestPrice(
  daily: number | null,
  fortnightly: number | null,
  monthly: number | null
): { amount: number; label: string } | null {
  if (daily !== null) return { amount: daily, label: '/day' }
  if (monthly !== null) return { amount: monthly, label: '/mo' }
  if (fortnightly !== null) return { amount: fortnightly, label: '/fn' }
  return null
}

export function ListingCard({ listing }: ListingCardProps) {
  const price = cheapestPrice(listing.price_daily, listing.price_fortnightly, listing.price_monthly)

  return (
    <Link href={`/listings/${listing.slug ?? listing.id}`} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
      <Card className="overflow-hidden transition-shadow group-hover:shadow-md h-full">
        {/* Photo */}
        <div className="relative aspect-[4/3] bg-muted">
          {listing.cover_photo ? (
            <Image
              src={listing.cover_photo.url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              No photo
            </div>
          )}

          {listing.is_sold_out && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge variant="destructive" className="text-sm px-3 py-1">
                Sold Out
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-3 space-y-2">
          {/* Title */}
          <p className="font-medium leading-tight line-clamp-2 text-sm">{listing.title}</p>

          {/* Location */}
          <p className="text-xs text-muted-foreground">
            {listing.suburb}, {listing.state}
          </p>

          {/* Space type + price */}
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">
              {SPACE_TYPE_LABELS[listing.space_type]}
            </Badge>

            {price && (
              <span className="text-sm font-semibold text-primary whitespace-nowrap">
                ${price.amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-xs font-normal text-muted-foreground">{price.label}</span>
              </span>
            )}
          </div>

          {/* Vehicle types */}
          {listing.listing_vehicles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {listing.listing_vehicles.map(({ vehicle }) => (
                <span
                  key={vehicle}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {VEHICLE_LABELS[vehicle]}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
