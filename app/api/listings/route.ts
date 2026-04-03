import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SpaceType, VehicleType, FeatureType } from '@/types/database'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl

  const search = searchParams.get('search') ?? ''
  const spaceTypes = searchParams.getAll('space_type') as SpaceType[]
  const vehicles = searchParams.getAll('vehicles') as VehicleType[]
  const features = searchParams.getAll('features') as FeatureType[]
  const minPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null
  const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null
  const sort = searchParams.get('sort') ?? 'newest'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = 12
  const offset = (page - 1) * limit

  let query = supabase
    .from('listings')
    .select(
      `
      *,
      listing_photos ( id, url, sort_order ),
      listing_vehicles ( vehicle ),
      listing_features ( feature )
      `,
      { count: 'exact' }
    )
    .eq('is_active', true)

  if (search) {
    query = query.or(`title.ilike.%${search}%,suburb.ilike.%${search}%,address.ilike.%${search}%`)
  }

  if (spaceTypes.length > 0) {
    query = query.in('space_type', spaceTypes)
  }

  // Price filter: filter by cheapest available price
  if (minPrice !== null) {
    query = query.or(
      `price_daily.gte.${minPrice},price_fortnightly.gte.${minPrice * 14},price_monthly.gte.${minPrice * 30}`
    )
  }
  if (maxPrice !== null) {
    // At least one price option must be within the max
    query = query.or(
      `price_daily.lte.${maxPrice},price_fortnightly.lte.${maxPrice * 14},price_monthly.lte.${maxPrice * 30}`
    )
  }

  switch (sort) {
    case 'price_asc':
      query = query.order('price_daily', { ascending: true, nullsFirst: false })
      break
    case 'price_desc':
      query = query.order('price_daily', { ascending: false, nullsFirst: false })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  query = query.range(offset, offset + limit - 1)

  const { data: rows, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Post-filter by vehicles and features (array membership — simpler than subquery via JS SDK)
  let listings = rows ?? []

  if (vehicles.length > 0) {
    listings = listings.filter((l) =>
      vehicles.some((v) => l.listing_vehicles.some((lv: { vehicle: VehicleType }) => lv.vehicle === v))
    )
  }

  if (features.length > 0) {
    listings = listings.filter((l) =>
      features.every((f) => l.listing_features.some((lf: { feature: FeatureType }) => lf.feature === f))
    )
  }

  // Return only first photo per listing
  const normalised = listings.map((l) => {
    const sorted = [...l.listing_photos].sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    )
    return {
      ...l,
      cover_photo: sorted[0] ?? null,
      listing_photos: undefined,
    }
  })

  return NextResponse.json({
    listings: normalised,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
