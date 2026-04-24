import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendEmail, APP_URL } from '@/lib/email/resend'
import { BookingAcceptedEmail } from '@/lib/email/templates/booking-accepted'
import { BookingDeclinedEmail } from '@/lib/email/templates/booking-declined'
import { createElement } from 'react'
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

  const serviceClient = getServiceClient()

  if (newStatus === 'accepted') {
    // In-app notification
    serviceClient
      .from('notifications')
      .insert({ user_id: booking.buyer_id, type: 'booking_accepted', booking_id: bookingId })
      .then(({ error }) => {
        if (error) console.error('[bookings PATCH] Notification insert error:', error.message)
      })

    // Email: fetch buyer, listing, and seller contact info
    Promise.all([
      serviceClient.from('users').select('email, full_name').eq('id', booking.buyer_id).single(),
      serviceClient.from('listings').select('title').eq('id', booking.listing_id).single(),
      serviceClient.from('users').select('full_name, email, phone').eq('id', booking.seller_id).single(),
    ])
      .then(([{ data: buyer }, { data: listing }, { data: seller }]) => {
        if (!buyer || !listing || !seller) return
        return sendEmail({
          to: buyer.email,
          subject: `Your booking request was accepted!`,
          react: createElement(BookingAcceptedEmail, {
            listingTitle: listing.title,
            sellerName: seller.full_name,
            sellerEmail: seller.email,
            sellerPhone: seller.phone,
            bookingUrl: `${APP_URL}/bookings/${bookingId}`,
          }),
        })
      })
      .catch((err) => console.error('[bookings PATCH] Accepted email error:', err))
  }

  if (newStatus === 'declined') {
    // In-app notification
    serviceClient
      .from('notifications')
      .insert({ user_id: booking.buyer_id, type: 'booking_declined', booking_id: bookingId })
      .then(({ error }) => {
        if (error) console.error('[bookings PATCH] Notification insert error:', error.message)
      })

    // Email: fetch buyer and listing title
    Promise.all([
      serviceClient.from('users').select('email').eq('id', booking.buyer_id).single(),
      serviceClient.from('listings').select('title').eq('id', booking.listing_id).single(),
    ])
      .then(([{ data: buyer }, { data: listing }]) => {
        if (!buyer || !listing) return
        return sendEmail({
          to: buyer.email,
          subject: `Update on your booking request`,
          react: createElement(BookingDeclinedEmail, {
            listingTitle: listing.title,
            listingsUrl: `${APP_URL}/listings`,
          }),
        })
      })
      .catch((err) => console.error('[bookings PATCH] Declined email error:', err))
  }

  return NextResponse.json({ booking: updated })
}
