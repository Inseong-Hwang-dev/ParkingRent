import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatPriceAmount, getAllPrices, type PriceDisplay } from '@/lib/listing-prices'
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
    price_weekly: number | null
    price_monthly: number | null
    is_sold_out: boolean
    cover_photo: { url: string } | null
    listing_vehicles: { vehicle: VehicleType }[]
  }
  variant?: 'default' | 'compact'
}

function ListingPrices({
  prices,
  size = 'default',
}: {
  prices: PriceDisplay[]
  size?: 'default' | 'compact'
}) {
  if (prices.length === 0) return null

  if (size === 'compact') {
    return (
      <div className="flex shrink-0 flex-col items-end gap-0">
        {prices.map(({ amount, label }) => (
          <span key={label} className="text-xs font-semibold text-primary whitespace-nowrap leading-tight">
            ${formatPriceAmount(amount)}
            <span className="text-[10px] font-normal text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap justify-end gap-x-2.5 gap-y-0.5">
      {prices.map(({ amount, label }) => (
        <span key={label} className="text-sm font-semibold text-primary whitespace-nowrap">
          ${formatPriceAmount(amount)}
          <span className="text-xs font-normal text-muted-foreground">{label}</span>
        </span>
      ))}
    </div>
  )
}

function ListingPhoto({
  listing,
  className,
  sizes,
}: {
  listing: ListingCardProps['listing']
  className?: string
  sizes: string
}) {
  return (
    <div className={`relative bg-muted shrink-0 ${className ?? ''}`}>
      {listing.cover_photo ? (
        <Image
          src={listing.cover_photo.url}
          alt={listing.title}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground text-[10px]">
          No photo
        </div>
      )}

      {listing.is_sold_out && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Sold Out
          </Badge>
        </div>
      )}
    </div>
  )
}

export function ListingCard({ listing, variant = 'default' }: ListingCardProps) {
  const prices = getAllPrices(listing.price_daily, listing.price_weekly, listing.price_monthly)
  const href = `/listings/${listing.slug ?? listing.id}`

  if (variant === 'compact') {
    const vehicles = listing.listing_vehicles.slice(0, 2)
    const extraVehicles = listing.listing_vehicles.length - vehicles.length

    return (
      <Link
        href={href}
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <Card className="overflow-hidden transition-shadow group-hover:shadow-sm">
          <div className="flex min-h-[88px]">
            <ListingPhoto
              listing={listing}
              className="w-[104px] self-stretch min-h-[88px]"
              sizes="104px"
            />

            <CardContent className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-2.5">
              <p className="font-medium leading-tight line-clamp-1 text-sm">{listing.title}</p>

              <p className="text-xs text-muted-foreground truncate">
                {listing.suburb}, {listing.state}
              </p>

              <div className="flex items-end justify-between gap-2 mt-auto">
                <div className="flex min-w-0 items-center gap-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {SPACE_TYPE_LABELS[listing.space_type]}
                  </Badge>
                  {vehicles.length > 0 && (
                    <span className="truncate text-[10px] text-muted-foreground">
                      {vehicles.map(({ vehicle }) => VEHICLE_LABELS[vehicle]).join(' · ')}
                      {extraVehicles > 0 && ` +${extraVehicles}`}
                    </span>
                  )}
                </div>

                <ListingPrices prices={prices} size="compact" />
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={href} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
      <Card className="overflow-hidden transition-shadow group-hover:shadow-md h-full">
        <ListingPhoto
          listing={listing}
          className="aspect-[4/3]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <CardContent className="p-3 space-y-2">
          <p className="font-medium leading-tight line-clamp-2 text-sm">{listing.title}</p>

          <p className="text-xs text-muted-foreground">
            {listing.suburb}, {listing.state}
          </p>

          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">
              {SPACE_TYPE_LABELS[listing.space_type]}
            </Badge>

            <ListingPrices prices={prices} />
          </div>

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
