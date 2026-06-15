'use server'

import { createClient } from '@/lib/supabase/server'
import type { SpaceType, VehicleType, FeatureType } from '@/types/database'

export type CreateListingInput = {
  title: string
  description: string | null
  address: string
  suburb: string
  state: string
  postcode: string
  lat: number
  lng: number
  space_type: SpaceType
  vehicles: VehicleType[]
  features: FeatureType[]
  price_daily: number | null
  price_weekly: number | null
  price_monthly: number | null
  access_instructions: string | null
}

export async function createListing(
  input: CreateListingInput
): Promise<{ listingId: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description || null,
      address: input.address,
      suburb: input.suburb,
      state: input.state,
      postcode: input.postcode,
      lat: input.lat,
      lng: input.lng,
      space_type: input.space_type,
      price_daily: input.price_daily,
      price_weekly: input.price_weekly,
      price_monthly: input.price_monthly,
      access_instructions: input.access_instructions || null,
    })
    .select('id')
    .single()

  if (listingError || !listing) {
    throw new Error(listingError?.message ?? 'Failed to create listing')
  }

  const listingId = listing.id

  if (input.vehicles.length > 0) {
    const { error } = await supabase
      .from('listing_vehicles')
      .insert(input.vehicles.map((vehicle) => ({ listing_id: listingId, vehicle })))
    if (error) throw new Error(error.message)
  }

  if (input.features.length > 0) {
    const { error } = await supabase
      .from('listing_features')
      .insert(input.features.map((feature) => ({ listing_id: listingId, feature })))
    if (error) throw new Error(error.message)
  }

  return { listingId }
}
