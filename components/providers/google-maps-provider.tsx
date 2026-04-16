'use client'

import { APIProvider } from '@vis.gl/react-google-maps'

/**
 * Single app-wide Google Maps API provider.
 * Loads both 'places' (autocomplete, new Places API) and 'marker' (AdvancedMarker)
 * libraries in one script request so that child components (map, search bar, listing
 * form) can call useMapsLibrary() without triggering additional script loads.
 */
export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker']} language="en" region="AU">
      {children}
    </APIProvider>
  )
}
