'use client'

import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { cn } from '@/lib/utils'

export interface PlaceResult {
  address: string
  suburb: string
  state: string
  postcode: string
  lat: number
  lng: number
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}

export function PlacesAutocomplete({
  onPlaceSelect,
  value,
  onChange,
  error,
  placeholder = 'Start typing an address…',
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const placesLib = useMapsLibrary('places')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'au' },
      fields: ['address_components', 'formatted_address', 'geometry'],
      types: ['address'],
      // Force English place names regardless of browser language
      language: 'en',
    } as google.maps.places.AutocompleteOptions & { language: string })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place?.geometry?.location || !place.address_components) return

      let suburb = ''
      let state = ''
      let postcode = ''

      for (const component of place.address_components) {
        const types = component.types
        if (
          types.includes('locality') ||
          (!suburb && types.includes('sublocality_level_1'))
        ) {
          suburb = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name
        } else if (types.includes('postal_code')) {
          postcode = component.long_name
        }
      }

      const formattedAddress = place.formatted_address ?? ''
      onChange(formattedAddress)

      onPlaceSelect({
        address: formattedAddress,
        suburb,
        state,
        postcode,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      })
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib, onPlaceSelect, onChange])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn(
          'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-destructive ring-destructive/20 focus-visible:ring-destructive/20'
            : 'border-input'
        )}
      />
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
