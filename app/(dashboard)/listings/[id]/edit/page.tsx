import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditListingForm } from '@/components/listings/edit-listing-form'
import type { VehicleType, FeatureType } from '@/types/database'

export const metadata = {
  title: 'Edit Listing',
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: listing, error } = await supabase
    .from('listings')
    .select(
      `
      *,
      listing_photos ( id, url, sort_order ),
      listing_vehicles ( vehicle ),
      listing_features ( feature )
      `
    )
    .eq('id', id)
    .single()

  if (error || !listing) notFound()

  if (listing.owner_id !== user.id) redirect('/dashboard')

  const photos = [...listing.listing_photos].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )

  return (
    <EditListingForm
      listingId={id}
      initialData={{
        title: listing.title,
        description: listing.description,
        address: listing.address,
        suburb: listing.suburb,
        state: listing.state,
        postcode: listing.postcode,
        lat: listing.lat,
        lng: listing.lng,
        space_type: listing.space_type,
        vehicles: listing.listing_vehicles.map((v: { vehicle: VehicleType }) => v.vehicle),
        features: listing.listing_features.map((f: { feature: FeatureType }) => f.feature),
        price_daily: listing.price_daily,
        price_weekly: listing.price_weekly,
        price_monthly: listing.price_monthly,
        access_instructions: listing.access_instructions,
        photos,
      }}
    />
  )
}
