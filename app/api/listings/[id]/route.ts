import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SpaceType, VehicleType, FeatureType } from '@/types/database'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: listingId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('listings')
    .select('owner_id')
    .eq('id', listingId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    title?: string
    description?: string | null
    address?: string
    suburb?: string
    state?: string
    postcode?: string
    lat?: number
    lng?: number
    space_type?: SpaceType
    vehicles?: VehicleType[]
    features?: FeatureType[]
    price_daily?: number | null
    price_fortnightly?: number | null
    price_monthly?: number | null
    access_instructions?: string | null
    is_sold_out?: boolean
    is_active?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Build the listings update patch from allowed fields
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') patch.title = body.title
  if ('description' in body) patch.description = body.description
  if (typeof body.address === 'string') patch.address = body.address
  if (typeof body.suburb === 'string') patch.suburb = body.suburb
  if (typeof body.state === 'string') patch.state = body.state
  if (typeof body.postcode === 'string') patch.postcode = body.postcode
  if (typeof body.lat === 'number') patch.lat = body.lat
  if (typeof body.lng === 'number') patch.lng = body.lng
  if (typeof body.space_type === 'string') patch.space_type = body.space_type
  if ('price_daily' in body) patch.price_daily = body.price_daily
  if ('price_fortnightly' in body) patch.price_fortnightly = body.price_fortnightly
  if ('price_monthly' in body) patch.price_monthly = body.price_monthly
  if ('access_instructions' in body) patch.access_instructions = body.access_instructions
  if (typeof body.is_sold_out === 'boolean') patch.is_sold_out = body.is_sold_out
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

  const { data: updated, error: updateError } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', listingId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Replace vehicles if provided
  if (Array.isArray(body.vehicles)) {
    const { error: delVehiclesErr } = await supabase
      .from('listing_vehicles')
      .delete()
      .eq('listing_id', listingId)

    if (delVehiclesErr) {
      return NextResponse.json({ error: delVehiclesErr.message }, { status: 500 })
    }

    if (body.vehicles.length > 0) {
      const { error: insVehiclesErr } = await supabase
        .from('listing_vehicles')
        .insert(body.vehicles.map((vehicle) => ({ listing_id: listingId, vehicle })))

      if (insVehiclesErr) {
        return NextResponse.json({ error: insVehiclesErr.message }, { status: 500 })
      }
    }
  }

  // Replace features if provided
  if (Array.isArray(body.features)) {
    const { error: delFeaturesErr } = await supabase
      .from('listing_features')
      .delete()
      .eq('listing_id', listingId)

    if (delFeaturesErr) {
      return NextResponse.json({ error: delFeaturesErr.message }, { status: 500 })
    }

    if (body.features.length > 0) {
      const { error: insFeaturesErr } = await supabase
        .from('listing_features')
        .insert(body.features.map((feature) => ({ listing_id: listingId, feature })))

      if (insFeaturesErr) {
        return NextResponse.json({ error: insFeaturesErr.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ listing: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: listingId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('listings')
    .select('owner_id')
    .eq('id', listingId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('listings')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', listingId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
