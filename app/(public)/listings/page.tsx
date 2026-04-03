import { Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/listings/listing-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { SpaceType, VehicleType, FeatureType } from '@/types/database'

export const metadata: Metadata = {
  title: 'Find Parking',
  description: 'Search and filter available parking spaces across Australia.',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPACE_TYPES: { value: SpaceType; label: string }[] = [
  { value: 'drive_away', label: 'Drive Away' },
  { value: 'lockup_garage', label: 'Lockup Garage' },
  { value: 'unsheltered', label: 'Unsheltered' },
  { value: 'sheltered', label: 'Sheltered' },
  { value: 'indoor_lot', label: 'Indoor Lot' },
]

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'small_car', label: 'Small Car' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'small_truck', label: 'Small Truck' },
  { value: 'large_truck', label: 'Large Truck' },
]

const FEATURES: { value: FeatureType; label: string }[] = [
  { value: 'access_247', label: '24/7 Access' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'disabled_access', label: 'Disabled Access' },
  { value: 'ev_charging', label: 'EV Charging' },
  { value: 'instant_booking', label: 'Instant Booking' },
  { value: 'security', label: 'Security' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchParams {
  search?: string
  space_type?: string | string[]
  vehicles?: string | string[]
  features?: string | string[]
  min_price?: string
  max_price?: string
  sort?: string
  page?: string
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchListings(searchParams: SearchParams) {
  const supabase = await createClient()

  const search = searchParams.search ?? ''
  const spaceTypes = toArray(searchParams.space_type) as SpaceType[]
  const vehicles = toArray(searchParams.vehicles) as VehicleType[]
  const features = toArray(searchParams.features) as FeatureType[]
  const sort = searchParams.sort ?? 'newest'
  const page = Math.max(1, Number(searchParams.page ?? '1'))
  const limit = 12
  const offset = (page - 1) * limit

  let query = supabase
    .from('listings')
    .select(
      `*, listing_photos ( id, url, sort_order ), listing_vehicles ( vehicle ), listing_features ( feature )`,
      { count: 'exact' }
    )
    .eq('is_active', true)

  if (search) {
    query = query.or(`title.ilike.%${search}%,suburb.ilike.%${search}%,address.ilike.%${search}%`)
  }

  if (spaceTypes.length > 0) {
    query = query.in('space_type', spaceTypes)
  }

  switch (sort) {
    case 'price_asc':
      query = query.order('price_daily', { ascending: true, nullsFirst: false })
      break
    case 'price_desc':
      query = query.order('price_daily', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data: rows, count, error } = await query

  if (error) return { listings: [], total: 0, totalPages: 0, error: error.message }

  let listings = rows ?? []

  if (vehicles.length > 0) {
    listings = listings.filter((l) =>
      vehicles.some((v) => l.listing_vehicles.some((lv: { vehicle: string }) => lv.vehicle === v))
    )
  }

  if (features.length > 0) {
    listings = listings.filter((l) =>
      features.every((f) => l.listing_features.some((lf: { feature: string }) => lf.feature === f))
    )
  }

  const normalised = listings.map((l) => ({
    ...l,
    cover_photo:
      [...l.listing_photos]
        .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)[0] ?? null,
  }))

  return {
    listings: normalised,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
    error: null,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

function buildUrl(base: SearchParams, overrides: Partial<SearchParams>): string {
  const merged = { ...base, ...overrides }
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (!v) continue
    if (Array.isArray(v)) v.forEach((item) => params.append(k, item))
    else params.set(k, v)
  }
  return `/listings?${params.toString()}`
}

// ─── Filter sidebar (server-rendered form) ────────────────────────────────────

function FilterSidebar({ searchParams }: { searchParams: SearchParams }) {
  const activeSpaceTypes = toArray(searchParams.space_type)
  const activeVehicles = toArray(searchParams.vehicles)
  const activeFeatures = toArray(searchParams.features)

  return (
    <aside className="w-full md:w-64 shrink-0 space-y-6">
      {/* Search */}
      <form method="GET" action="/listings">
        {/* Preserve other filters when searching */}
        {activeSpaceTypes.map((v) => (
          <input key={v} type="hidden" name="space_type" value={v} />
        ))}
        {activeVehicles.map((v) => (
          <input key={v} type="hidden" name="vehicles" value={v} />
        ))}
        {activeFeatures.map((v) => (
          <input key={v} type="hidden" name="features" value={v} />
        ))}
        {searchParams.sort && <input type="hidden" name="sort" value={searchParams.sort} />}
        <div className="flex gap-2">
          <Input
            name="search"
            placeholder="Suburb or address…"
            defaultValue={searchParams.search ?? ''}
            className="flex-1"
          />
          <Button type="submit" size="sm">Search</Button>
        </div>
      </form>

      <Separator />

      {/* Space Type */}
      <div>
        <p className="text-sm font-semibold mb-3">Space Type</p>
        <div className="space-y-2">
          {SPACE_TYPES.map(({ value, label }) => {
            const isActive = activeSpaceTypes.includes(value)
            const next = isActive
              ? activeSpaceTypes.filter((v) => v !== value)
              : [...activeSpaceTypes, value]
            return (
              <Link
                key={value}
                href={buildUrl(searchParams, { space_type: next, page: '1' })}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  }`}
                  aria-hidden="true"
                >
                  {isActive && (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Vehicle Type */}
      <div>
        <p className="text-sm font-semibold mb-3">Vehicle Type</p>
        <div className="space-y-2">
          {VEHICLE_TYPES.map(({ value, label }) => {
            const isActive = activeVehicles.includes(value)
            const next = isActive
              ? activeVehicles.filter((v) => v !== value)
              : [...activeVehicles, value]
            return (
              <Link
                key={value}
                href={buildUrl(searchParams, { vehicles: next, page: '1' })}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  }`}
                  aria-hidden="true"
                >
                  {isActive && (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Features */}
      <div>
        <p className="text-sm font-semibold mb-3">Features</p>
        <div className="space-y-2">
          {FEATURES.map(({ value, label }) => {
            const isActive = activeFeatures.includes(value)
            const next = isActive
              ? activeFeatures.filter((v) => v !== value)
              : [...activeFeatures, value]
            return (
              <Link
                key={value}
                href={buildUrl(searchParams, { features: next, page: '1' })}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  }`}
                  aria-hidden="true"
                >
                  {isActive && (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Clear filters */}
      {(activeSpaceTypes.length > 0 || activeVehicles.length > 0 || activeFeatures.length > 0) && (
        <>
          <Separator />
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href={buildUrl(searchParams, { space_type: [], vehicles: [], features: [], page: '1' })}>
              Clear filters
            </Link>
          </Button>
        </>
      )}
    </aside>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const sort = params.sort ?? 'newest'
  const page = Number(params.page ?? '1')

  const { listings, total, totalPages, error } = await fetchListings(params)

  const activeFiltersCount =
    toArray(params.space_type).length +
    toArray(params.vehicles).length +
    toArray(params.features).length

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {params.search ? `Results for "${params.search}"` : 'Find Parking'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} space{total !== 1 ? 's' : ''} available
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
              </Badge>
            )}
          </p>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">Sort:</span>
          <div className="flex gap-1 flex-wrap">
            {SORT_OPTIONS.map(({ value, label }) => (
              <Link
                key={value}
                href={buildUrl(params, { sort: value, page: '1' })}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  sort === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar filters */}
        <FilterSidebar searchParams={params} />

        {/* Listings grid */}
        <div className="flex-1 min-w-0">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load listings. Please try again.
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium">No spaces found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <Link href="/listings">Clear all</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Suspense>
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </Suspense>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {page > 1 && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildUrl(params, { page: String(page - 1) })}>Previous</Link>
                    </Button>
                  )}
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildUrl(params, { page: String(page + 1) })}>Next</Link>
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
