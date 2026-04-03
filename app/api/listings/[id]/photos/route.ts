import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id: listingId } = await params

  const { data: listing } = await supabase
    .from('listings')
    .select('owner_id')
    .eq('id', listingId)
    .single()

  if (!listing || listing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { count } = await supabase
    .from('listing_photos')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Maximum 10 photos per listing' },
      { status: 400 }
    )
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Use JPEG, PNG, or WebP.' },
      { status: 400 }
    )
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large. Maximum 5 MB per photo.' },
      { status: 400 }
    )
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const photoId = crypto.randomUUID()
  const storagePath = `${listingId}/${photoId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('listing-photos')
    .upload(storagePath, arrayBuffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('listing-photos').getPublicUrl(storagePath)

  const { data: photo, error: dbError } = await supabase
    .from('listing_photos')
    .insert({
      listing_id: listingId,
      storage_path: storagePath,
      url: publicUrl,
      sort_order: count ?? 0,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ photo })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id: listingId } = await params

  const { data: listing } = await supabase
    .from('listings')
    .select('owner_id')
    .eq('id', listingId)
    .single()

  if (!listing || listing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { photoId } = await req.json()

  const { data: photo } = await supabase
    .from('listing_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('listing_id', listingId)
    .single()

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  await supabase.storage.from('listing-photos').remove([photo.storage_path])
  await supabase.from('listing_photos').delete().eq('id', photoId)

  return NextResponse.json({ success: true })
}
