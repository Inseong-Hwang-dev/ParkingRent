'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function PlacesAutocomplete({
  onPlaceSelect,
  value,
  onChange,
  error,
  placeholder = 'Start typing an address…',
}: PlacesAutocompleteProps) {
  // useMapsLibrary triggers the places library load; once non-null we can use
  // the google.maps.places.* namespace.
  const placesLib = useMapsLibrary('places')

  const [suggestions, setSuggestions]   = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex]   = useState(-1)

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef    = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)

  // Create a new billing session token once the library is ready.
  useEffect(() => {
    if (!placesLib) return
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
  }, [placesLib])

  // ── Fetch suggestions (debounced) ─────────────────────────────────────────

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!placesLib || input.trim().length < 2) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }

      try {
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: input.trim(),
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: ['au'],
            // 'address' returns precise street addresses, suitable for listing creation.
            includedPrimaryTypes: ['address'],
            language: 'en',
          })
        setSuggestions(suggestions)
        setShowDropdown(suggestions.length > 0)
        setActiveIndex(-1)
      } catch {
        setSuggestions([])
        setShowDropdown(false)
      }
    },
    [placesLib]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!e.target.value.trim()) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }
      debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 250)
    },
    [onChange, fetchSuggestions]
  )

  // ── Place selection ────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      const pred = suggestion.placePrediction
      if (!pred) return

      setSuggestions([])
      setShowDropdown(false)

      try {
        const place = pred.toPlace()
        await place.fetchFields({ fields: ['location', 'formattedAddress', 'addressComponents'] })

        if (!place.location) return

        const comps = place.addressComponents ?? []
        let suburb = ''
        let state = ''
        let postcode = ''

        for (const comp of comps) {
          const types = comp.types
          if (types.includes('locality') || (!suburb && types.includes('sublocality_level_1'))) {
            suburb = comp.longText ?? ''
          } else if (types.includes('administrative_area_level_1')) {
            state = comp.shortText ?? ''
          } else if (types.includes('postal_code')) {
            postcode = comp.longText ?? ''
          }
        }

        const formattedAddress = place.formattedAddress ?? pred.text?.text ?? ''
        onChange(formattedAddress)

        // Conclude the billing session — reset token for the next search.
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()

        onPlaceSelect({
          address: formattedAddress,
          suburb,
          state,
          postcode,
          lat: place.location.lat(),
          lng: place.location.lng(),
        })
      } catch {
        // Silently ignore fetch errors — user can retry.
      }
    },
    [onChange, onPlaceSelect]
  )

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault()
        handleSelect(suggestions[activeIndex])
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
        setActiveIndex(-1)
      }
    },
    [showDropdown, suggestions, activeIndex, handleSelect]
  )

  // ── Click-outside handler ─────────────────────────────────────────────────

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `pac-suggestion-${activeIndex}` : undefined}
        role="combobox"
        autoComplete="off"
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
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {/* ── Suggestions dropdown ── */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Address suggestions"
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md overflow-hidden"
        >
          {suggestions.map((suggestion, index) => {
            const pred      = suggestion.placePrediction
            const main      = pred?.mainText?.text ?? pred?.text?.text ?? ''
            const secondary = pred?.secondaryText?.text ?? ''
            const isActive  = activeIndex === index

            return (
              <li
                key={pred?.placeId ?? index}
                id={`pac-suggestion-${index}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(suggestion) }}
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{main}</span>
                    {secondary && (
                      <span className="block text-xs text-muted-foreground truncate">{secondary}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
