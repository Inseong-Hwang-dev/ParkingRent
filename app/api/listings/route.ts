import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toFiniteNumberOrNull(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}


function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl
  const isDev = process.env.NODE_ENV !== 'production'

  const spaceTypes   = searchParams.getAll('space_type')
  const vehicles     = searchParams.getAll('vehicles')
  const features     = searchParams.getAll('features')
  const minPrice     = toFiniteNumberOrNull(searchParams.get('min_price'))
  const maxPrice     = toFiniteNumberOrNull(searchParams.get('max_price'))
  const searchLat    = toFiniteNumberOrNull(searchParams.get('lat'))
  const searchLng    = toFiniteNumberOrNull(searchParams.get('lng'))
  const neLat        = toFiniteNumberOrNull(searchParams.get('ne_lat'))
  const neLng        = toFiniteNumberOrNull(searchParams.get('ne_lng'))
  const swLat        = toFiniteNumberOrNull(searchParams.get('sw_lat'))
  const swLng        = toFiniteNumberOrNull(searchParams.get('sw_lng'))
  const sort = searchParams.get('sort') ?? 'newest'
  const page         = clampInt(toFiniteNumberOrNull(searchParams.get('page')) ?? 1, 1, 10_000)
  const limit        = clampInt(toFiniteNumberOrNull(searchParams.get('limit')) ?? 12, 1, 500)
  const offset       = (page - 1) * limit

  const rpcArgs = {
    p_search: '',
    p_space_types: spaceTypes.length > 0 ? spaceTypes : null,
    p_vehicles: vehicles.length > 0 ? vehicles : null,
    p_features: features.length > 0 ? features : null,
    p_min_price: minPrice,
    p_max_price: maxPrice,
    p_search_lat: searchLat,
    p_search_lng: searchLng,
    p_radius_metres: null,
    p_ne_lat: neLat,
    p_ne_lng: neLng,
    p_sw_lat: swLat,
    p_sw_lng: swLng,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  }

  try {
    const { data, error } = await supabase.rpc('search_listings', rpcArgs)

    if (error) {
      if (isDev) {
        console.error('[api/listings] RPC search_listings failed', {
          error,
          message: error.message,
          details: (error as unknown as { details?: unknown }).details,
          hint: (error as unknown as { hint?: unknown }).hint,
          code: (error as unknown as { code?: unknown }).code,
          rpcArgs,
          url: req.nextUrl.toString(),
        })
      }
      throw error
    }

    const rows = data ?? []
    const totalCount = rows.length > 0 ? Number((rows[0] as { total_count?: unknown }).total_count) : 0

    return NextResponse.json({
      listings: rows,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    })
  } catch (err) {
    // Fallback to basic query without PostGIS/RPC (best-effort).
    if (isDev) {
      console.error('[api/listings] Falling back to basic listings query', {
        err,
        rpcArgs,
        url: req.nextUrl.toString(),
      })
    }

    let query = supabase
      .from('listings')
      .select('*, listing_photos(id, url, sort_order), listing_vehicles(vehicle), listing_features(feature)', {
        count: 'exact',
      })
      .eq('is_active', true)

    if (spaceTypes.length > 0) query = query.in('space_type', spaceTypes as any)

    // Bounds filter (map viewport)
    if (neLat !== null && swLat !== null) query = query.gte('lat', Math.min(swLat, neLat)).lte('lat', Math.max(swLat, neLat))
    if (neLng !== null && swLng !== null) query = query.gte('lng', Math.min(swLng, neLng)).lte('lng', Math.max(swLng, neLng))

    // Price filter (best-effort: apply to daily price only)
    if (minPrice !== null) query = query.gte('price_daily', minPrice)
    if (maxPrice !== null) query = query.lte('price_daily', maxPrice)

    // Sort (best-effort)
    if (sort === 'price_asc') query = query.order('price_daily', { ascending: true, nullsFirst: false })
    else if (sort === 'price_desc') query = query.order('price_daily', { ascending: false, nullsFirst: false })
    else if (sort === 'featured') query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    query = query.range(offset, offset + limit - 1)

    const { data: rows, error: basicError, count } = await query

    if (basicError) {
      if (isDev) {
        console.error('[api/listings] Basic listings query failed', {
          error: basicError,
          message: basicError.message,
          details: (basicError as unknown as { details?: unknown }).details,
          hint: (basicError as unknown as { hint?: unknown }).hint,
          code: (basicError as unknown as { code?: unknown }).code,
          url: req.nextUrl.toString(),
        })
      }
      return NextResponse.json({ error: basicError.message }, { status: 500 })
    }

    const totalCount = count ?? (rows?.length ?? 0)

    // Normalise to match RPC shape expectations for cover photo.
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
    })

    return NextResponse.json({
      listings,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    })
  }
}
