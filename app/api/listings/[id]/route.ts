import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const { data: listing } = await supabase
    .from('listings')
    .select('owner_id')
    .eq('id', listingId)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { is_sold_out?: boolean; is_active?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Only allow updating these two fields
  const patch: { is_sold_out?: boolean; is_active?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if (typeof body.is_sold_out === 'boolean') patch.is_sold_out = body.is_sold_out
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

  const { data: updated, error } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', listingId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ listing: updated })
}
