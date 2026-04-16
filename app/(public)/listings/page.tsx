import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ListingsClientView } from '@/components/listings/listings-client-view'
import { FilterPanel, type FilterParams } from '@/components/listings/filter-panel'
import { ListingsSearchBar } from '@/components/listings/listings-search-bar'
import type { MapListing } from '@/components/listings/listings-map'

export const metadata: Metadata = {
  title: 'Find Parking',
  description: 'Search and filter available parking spaces across Australia.',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = FilterParams

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

function toFiniteNumberOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}


function buildUrl(base: SearchParams, overrides: Record<string, string | string[]>): string {
  const merged: Record<string, string | string[] | undefined> = { ...base, ...overrides }
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (!v) continue
    if (Array.isArray(v)) v.forEach((item) => params.append(k, item))
    else params.set(k, v)
  }
  return `/listings?${params.toString()}`
}

function countActiveFilters(params: SearchParams): number {
  return (
    toArray(params.space_type).length +
    toArray(params.vehicles).length +
    toArray(params.features).length +
    (params.min_price ? 1 : 0) +
    (params.max_price ? 1 : 0)
  )
}

// ─── Data fetching via search_listings RPC ────────────────────────────────────

async function fetchListings(searchParams: SearchParams) {
  const supabase = await createClient()
  const isDev = process.env.NODE_ENV !== 'production'

  const spaceTypes = toArray(searchParams.space_type)
  const vehicles   = toArray(searchParams.vehicles)
  const features   = toArray(searchParams.features)
  const sort = searchParams.sort ?? 'newest'
  const searchLat = toFiniteNumberOrNull(searchParams.lat)
  const searchLng = toFiniteNumberOrNull(searchParams.lng)

  const rpcArgs = {
    p_search: '',
    p_space_types: spaceTypes.length > 0 ? spaceTypes : null,
    p_vehicles: vehicles.length > 0 ? vehicles : null,
    p_features: features.length > 0 ? features : null,
    p_min_price: toFiniteNumberOrNull(searchParams.min_price),
    p_max_price: toFiniteNumberOrNull(searchParams.max_price),
    p_search_lat: searchLat,
    p_search_lng: searchLng,
    p_radius_metres: null,
    p_ne_lat: toFiniteNumberOrNull(searchParams.ne_lat),
    p_ne_lng: toFiniteNumberOrNull(searchParams.ne_lng),
    p_sw_lat: toFiniteNumberOrNull(searchParams.sw_lat),
    p_sw_lng: toFiniteNumberOrNull(searchParams.sw_lng),
    p_sort: sort,
    p_limit: 100,
    p_offset: 0,
  }

  try {
    const { data, error } = await supabase.rpc('search_listings', rpcArgs)
    if (error) {
      if (isDev) console.error('[listings/page] RPC search_listings failed', error)
      throw error
    }

    const rows       = data ?? []
    const totalCount = rows.length > 0 ? Number((rows[0] as { total_count?: unknown }).total_count) : 0
    const listings   = rows as unknown as MapListing[]

    return { listings, total: totalCount, error: null }
  } catch (err) {
    if (isDev) console.error('[listings/page] Falling back to basic listings query', { err, rpcArgs })

    let query = supabase
      .from('listings')
      .select('*, listing_photos(id, url, sort_order), listing_vehicles(vehicle), listing_features(feature)', {
        count: 'exact',
      })
      .eq('is_active', true)

    if (spaceTypes.length > 0) query = query.in('space_type', spaceTypes as any)

    const minPrice = toFiniteNumberOrNull(searchParams.min_price)
    const maxPrice = toFiniteNumberOrNull(searchParams.max_price)
    if (minPrice !== null) query = query.gte('price_daily', minPrice)
    if (maxPrice !== null) query = query.lte('price_daily', maxPrice)

    if (sort === 'price_asc') query = query.order('price_daily', { ascending: true, nullsFirst: false })
    else if (sort === 'price_desc') query = query.order('price_daily', { ascending: false, nullsFirst: false })
    else if (sort === 'featured') query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    query = query.range(0, 99)

    const { data: rows, error: basicError, count } = await query
    if (basicError) {
      if (isDev) console.error('[listings/page] Basic listings query failed', basicError)
      return { listings: [] as MapListing[], total: 0, error: basicError.message }
    }

    const totalCount = count ?? (rows?.length ?? 0)
    const listings = (rows ?? []).map((l: any) => {
      const photos = Array.isArray(l.listing_photos) ? [...l.listing_photos] : []
      const cover =
        photos.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)[0] ?? null
      return {
        ...l,
        cover_photo: cover ? { url: cover.url, sort_order: cover.sort_order } : null,
        listing_vehicles: l.listing_vehicles ?? [],
        listing_features: l.listing_features ?? [],
        distance_metres: null,
        total_count: totalCount,
      }
    }) as unknown as MapListing[]

    return { listings, total: totalCount, error: null }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const sort   = params.sort ?? 'newest'

  const { listings, total, error } = await fetchListings(params)

  const activeFiltersCount = countActiveFilters(params)

  const filters: Record<string, string | string[] | undefined> = {
    location:   params.location ?? params.search,
    space_type: params.space_type,
    vehicles:   params.vehicles,
    features:   params.features,
    min_price:  params.min_price,
    max_price:  params.max_price,
    sort:       params.sort,
    lat:        params.lat,
    lng:        params.lng,
    ne_lat:     params.ne_lat,
    ne_lng:     params.ne_lng,
    sw_lat:     params.sw_lat,
    sw_lng:     params.sw_lng,
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b bg-background px-4 sm:px-6 pt-4 pb-3 shrink-0">
        <ListingsSearchBar currentParams={params} />

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <div>
            <h1 className="text-xl font-bold">
              {params.location ?? params.search ? `Results near "${params.location ?? params.search}"` : 'Find Parking'}
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

          {/* Sort pills — visible on all screen sizes in the header */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground shrink-0 hidden sm:inline">Sort:</span>
            <div className="flex gap-1 flex-wrap">
              {[
                { value: 'newest',     label: 'Newest' },
                { value: 'price_asc',  label: 'Price ↑' },
                { value: 'price_desc', label: 'Price ↓' },
                { value: 'featured',   label: 'Featured' },
              ].map(({ value, label }) => (
                <Link
                  key={value}
                  href={buildUrl(params, { sort: value })}
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
      </div>

      {/* ── Split-screen content ────────────────────────────────────────────── */}
      <ListingsClientView
        listings={listings}
        filters={filters}
        filterPanel={<FilterPanel currentParams={params} showSidebar={false} />}
        error={error}
      />
    </div>
  )
}
