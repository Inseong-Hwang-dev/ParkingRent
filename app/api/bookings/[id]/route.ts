import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { BookingStatus, Database } from '@/types/database'

function getServiceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: bookingId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: { status?: BookingStatus }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { status: newStatus } = body
  if (!newStatus) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 })
  }

  // Fetch the booking to validate the transition
  const { data: booking, error: fetchError } = await supabase
    .from('booking_requests')
    .select('id, status, buyer_id, seller_id, listing_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const isBuyer = user.id === booking.buyer_id
  const isSeller = user.id === booking.seller_id

  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate allowed transitions
  const currentStatus = booking.status
  const sellerTransitions: BookingStatus[] = ['accepted', 'declined']
  const buyerTransitions: BookingStatus[] = ['cancelled']

  if (currentStatus !== 'pending') {
    return NextResponse.json(
      { error: `Cannot transition from status '${currentStatus}'` },
      { status: 409 }
    )
  }

  if (isSeller && !sellerTransitions.includes(newStatus)) {
    return NextResponse.json(
      { error: `Seller may only set status to 'accepted' or 'declined'` },
      { status: 403 }
    )
  }

  if (isBuyer && !buyerTransitions.includes(newStatus)) {
    return NextResponse.json(
      { error: `Buyer may only set status to 'cancelled'` },
      { status: 403 }
    )
  }

  // Perform the update
  const { data: updated, error: updateError } = await supabase
    .from('booking_requests')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // On accepted: notify the buyer via service role
  if (newStatus === 'accepted') {
    const serviceClient = getServiceClient()
    await serviceClient.from('notifications').insert({
      user_id: booking.buyer_id,
      type: 'booking_accepted',
      booking_id: bookingId,
    })
  }

  // On declined: notify the buyer via service role
  if (newStatus === 'declined') {
    const serviceClient = getServiceClient()
    await serviceClient.from('notifications').insert({
      user_id: booking.buyer_id,
      type: 'booking_declined',
      booking_id: bookingId,
    })
  }

  return NextResponse.json({ booking: updated })
}
