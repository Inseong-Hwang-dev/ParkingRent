'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Map as MapIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListingCard } from './listing-card'
import { ListingsMap } from './listings-map'
import type { MapListing } from './listings-map'

export type { MapListing }

interface ListingsClientViewProps {
  listings: MapListing[]
  filters: Record<string, string | string[] | undefined>
  filterPanel: React.ReactNode
  error: string | null
}

export function ListingsClientView({
  listings,
  filters,
  filterPanel,
  error,
}: ListingsClientViewProps) {
  const [hoveredListingId, setHoveredListingId]   = useState<string | null>(null)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [mapListings, setMapListings]             = useState<MapListing[]>(listings)
  const [mobileMapOpen, setMobileMapOpen]         = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedListingId((prev) => (prev === id ? null : id))
    const el = cardRefs.current.get(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const handleDeselect = useCallback(() => setSelectedListingId(null), [])

  const handleListingsChange = useCallback((next: MapListing[]) => {
    setMapListings(next)
  }, [])

  const latStr = typeof filters.lat === 'string' ? filters.lat : null
  const lngStr = typeof filters.lng === 'string' ? filters.lng : null
  const searchLat = latStr !== null ? Number(latStr) : NaN
  const searchLng = lngStr !== null ? Number(lngStr) : NaN
  const searchLocation =
    Number.isFinite(searchLat) && Number.isFinite(searchLng)
      ? { lat: searchLat, lng: searchLng }
      : null

  const mapProps = {
    initialListings: listings,
    filters,
    searchLocation,
    hoveredListingId,
    selectedListingId,
    onMarkerClick: handleMarkerClick,
    onDeselect: handleDeselect,
    onMarkerHover: setHoveredListingId,
    onListingsChange: handleListingsChange,
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Left panel: card list (40% desktop, full-width mobile) ──────────── */}
      <div className="flex flex-col w-full md:w-[40%] overflow-hidden border-r shrink-0">

        {/* Controls bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b shrink-0 bg-background">
          <p className="text-sm text-muted-foreground">
            {mapListings.length} space{mapListings.length !== 1 ? 's' : ''} in view
          </p>
          {filterPanel}
        </div>

        {/* Scrollable card list */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load listings. Please try again.
            </div>
          ) : mapListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <p className="text-lg font-medium">No spaces found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search, filters, or panning the map.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <Link href="/listings">Clear all</Link>
              </Button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {mapListings.map((listing) => {
                const isSelected = selectedListingId === listing.id
                const isHovered  = hoveredListingId  === listing.id
                return (
                  <div
                    key={listing.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(listing.id, el)
                      else cardRefs.current.delete(listing.id)
                    }}
                    onMouseEnter={() => setHoveredListingId(listing.id)}
                    onMouseLeave={() => setHoveredListingId(null)}
                    className={`rounded-xl ring-2 transition-all ${
                      isSelected
                        ? 'ring-primary shadow-md'
                        : isHovered
                        ? 'ring-primary/40'
                        : 'ring-transparent'
                    }`}
                  >
                    <ListingCard listing={listing} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: sticky map (60% desktop, hidden mobile) ────────────── */}
      <div className="hidden md:block md:flex-1 relative">
        <ListingsMap {...mapProps} />
      </div>

      {/* ── Mobile: floating "Show Map" button ──────────────────────────────── */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <Button
          onClick={() => setMobileMapOpen(true)}
          className="rounded-full shadow-lg px-5 gap-2"
        >
          <MapIcon className="h-4 w-4" />
          Show Map
        </Button>
      </div>

      {/* ── Mobile: full-screen map overlay ─────────────────────────────────── */}
      {mobileMapOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background flex flex-col">
          {/* Close bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <p className="text-sm font-medium">
              {mapListings.length} space{mapListings.length !== 1 ? 's' : ''} in view
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileMapOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close map</span>
            </Button>
          </div>
          {/* Map */}
          <div className="flex-1 relative">
            <ListingsMap {...mapProps} />
          </div>
        </div>
      )}
    </div>
  )
}
