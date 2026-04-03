import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { PricingType, Database } from '@/types/database'

function getServiceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: { listing_id?: string; pricing_type?: PricingType; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { listing_id, pricing_type, message } = body

  if (!listing_id || !pricing_type) {
    return NextResponse.json(
      { error: 'listing_id and pricing_type are required' },
      { status: 400 }
    )
  }

  const validPricingTypes: PricingType[] = ['daily', 'fortnightly', 'monthly']
  if (!validPricingTypes.includes(pricing_type)) {
    return NextResponse.json({ error: 'Invalid pricing_type' }, { status: 400 })
  }

  // Fetch listing to get owner and validate it exists and is active
  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, is_active, is_sold_out, price_daily, price_fortnightly, price_monthly')
    .eq('id', listing_id)
    .single()

  if (!listing || !listing.is_active) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.is_sold_out) {
    return NextResponse.json({ error: 'This listing is sold out' }, { status: 409 })
  }

  if (listing.owner_id === user.id) {
    return NextResponse.json({ error: 'You cannot book your own listing' }, { status: 409 })
  }

  // Validate the requested pricing_type is available
  const priceMap = {
    daily: listing.price_daily,
    fortnightly: listing.price_fortnightly,
    monthly: listing.price_monthly,
  }
  if (priceMap[pricing_type] === null) {
    return NextResponse.json(
      { error: `This listing does not offer ${pricing_type} pricing` },
      { status: 400 }
    )
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('booking_requests')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('buyer_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a pending request for this listing' },
      { status: 409 }
    )
  }

  // Insert booking using user client (RLS: buyer_id = auth.uid())
  const { data: booking, error: bookingError } = await supabase
    .from('booking_requests')
    .insert({
      listing_id,
      buyer_id: user.id,
      seller_id: listing.owner_id,
      pricing_type,
      message: message ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 })
  }

  // Insert notification for seller via service role (bypasses RLS insert restriction)
  const serviceClient = getServiceClient()
  await serviceClient.from('notifications').insert({
    user_id: listing.owner_id,
    type: 'booking_request',
    booking_id: booking.id,
  })

  return NextResponse.json({ booking }, { status: 201 })
}
