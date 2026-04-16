'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Search, X, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FilterParams } from './filter-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingsSearchBarProps {
  currentParams: FilterParams
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ListingsSearchBar({ currentParams }: ListingsSearchBarProps) {
  const router    = useRouter()
  // useMapsLibrary triggers loading of the 'places' library. The actual API
  // calls use the global google.maps.places.* namespace once loaded.
  const placesLib = useMapsLibrary('places')

  const [inputValue, setInputValue]     = useState(currentParams.search ?? '')
  const [suggestions, setSuggestions]   = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex]   = useState(-1)
  const [isLoading, setIsLoading]       = useState(false)

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentParamsRef = useRef(currentParams)
  const containerRef    = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)

  // Keep params ref current so closures don't capture stale values.
  useEffect(() => { currentParamsRef.current = currentParams }, [currentParams])

  // Create a new billing session token once the Places library is ready.
  useEffect(() => {
    if (!placesLib) return
    console.log('placesLib loaded:', !!placesLib)
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
  }, [placesLib])

  // ── Navigation helper ──────────────────────────────────────────────────────

  const navigate = useCallback(
    (search: string, lat?: number, lng?: number) => {
      const p = currentParamsRef.current
      const params = new URLSearchParams()

      if (search.trim()) params.set('search', search.trim())
      if (lat !== undefined) params.set('lat', String(lat))
      if (lng !== undefined) params.set('lng', String(lng))

      // Preserve active filters across a location change.
      const arrayKeys = ['space_type', 'vehicles', 'features'] as const
      for (const key of arrayKeys) {
        const val = p[key]
        if (!val) continue
        if (Array.isArray(val)) val.forEach((v) => params.append(key, v))
        else params.append(key, val)
      }
      if (p.min_price) params.set('min_price', p.min_price)
      if (p.max_price) params.set('max_price', p.max_price)

      if (p.sort) params.set('sort', p.sort)

      router.push(`/listings?${params.toString()}`)
    },
    [router]
  )

  // ── Fetch autocomplete suggestions ────────────────────────────────────────

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!placesLib || input.trim().length < 2) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }

      setIsLoading(true)
      try {
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: input.trim(),
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: ['au'],
            // '(regions)' returns localities, suburbs, postcodes, and admin areas.
            includedPrimaryTypes: ['locality', 'sublocality', 'postal_code', 'neighborhood'],
            language: 'en',
          })
        setSuggestions(suggestions)
        setShowDropdown(suggestions.length > 0)
        setActiveIndex(-1)
      } catch (err) {
        console.error('[ListingsSearchBar] fetchAutocompleteSuggestions failed:', err)
        setSuggestions([])
        setShowDropdown(false)
      } finally {
        setIsLoading(false)
      }
    },
    [placesLib]
  )

  // ── Input change handler (debounced) ──────────────────────────────────────

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!value.trim()) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }
      debounceRef.current = setTimeout(() => fetchSuggestions(value), 250)
    },
    [fetchSuggestions]
  )

  // ── Place selection ────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      const pred = suggestion.placePrediction
      if (!pred) return

      const displayText = pred.text?.text ?? pred.mainText?.text ?? ''
      setInputValue(displayText)
      setSuggestions([])
      setShowDropdown(false)

      try {
        const place = pred.toPlace()
        await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] })

        if (place.location) {
          const lat = place.location.lat()
          const lng = place.location.lng()
          const locationText = place.formattedAddress ?? displayText

          // Conclude the billing session — reset token for the next search.
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()

          navigate(locationText, lat, lng)
        } else {
          navigate(displayText)
        }
      } catch {
        navigate(displayText)
      }
    },
    [navigate]
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

  // ── Form submit (geocode first, fall back to plain text search) ──────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSuggestions([])
      setShowDropdown(false)

      if (!placesLib || !inputValue.trim()) {
        navigate(inputValue)
        return
      }

      setIsLoading(true)
      try {
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: inputValue.trim(),
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: ['au'],
            includedPrimaryTypes: ['locality', 'sublocality', 'postal_code', 'neighborhood'],
            language: 'en',
          })

        if (suggestions.length > 0) {
          // handleSelect manages setIsLoading(false) indirectly — we let it
          // run its own async flow, so clear loading here before handing off.
          setIsLoading(false)
          await handleSelect(suggestions[0])
        } else {
          navigate(inputValue)
        }
      } catch {
        navigate(inputValue)
      } finally {
        setIsLoading(false)
      }
    },
    [navigate, inputValue, placesLib, handleSelect]
  )

  // ── Clear button ──────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setInputValue('')
    setSuggestions([])
    setShowDropdown(false)
    inputRef.current?.focus()

    const p = currentParamsRef.current
    const params = new URLSearchParams()
    const arrayKeys = ['space_type', 'vehicles', 'features'] as const
    for (const key of arrayKeys) {
      const val = p[key]
      if (!val) continue
      if (Array.isArray(val)) val.forEach((v) => params.append(key, v))
      else params.append(key, val)
    }
    if (p.min_price) params.set('min_price', p.min_price)
    if (p.max_price) params.set('max_price', p.max_price)
    if (p.sort) params.set('sort', p.sort)
    router.push(`/listings?${params.toString()}`)
  }, [router])

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
    <div ref={containerRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Suburb, postcode or address…"
            className="pl-9 pr-8"
            autoComplete="off"
            aria-label="Search location"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            role="combobox"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" size="sm" disabled={isLoading}>
          Search
        </Button>
      </form>

      {/* ── Autocomplete dropdown ── */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Location suggestions"
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md overflow-hidden"
        >
          {suggestions.map((suggestion, index) => {
            const pred    = suggestion.placePrediction
            const main    = pred?.mainText?.text ?? pred?.text?.text ?? ''
            const secondary = pred?.secondaryText?.text ?? ''
            const isActive  = activeIndex === index

            return (
              <li
                key={pred?.placeId ?? index}
                id={`suggestion-${index}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  // Use mousedown so the blur on the input fires after selection.
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
