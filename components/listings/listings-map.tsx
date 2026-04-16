'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  type MapCameraChangedEvent,
} from '@vis.gl/react-google-maps'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { PriceMarker } from './listings-map-marker'
import type { SpaceType, VehicleType } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapListing {
  id: string
  title: string
  lat: number
  lng: number
  suburb: string
  state: string
  space_type: SpaceType
  price_daily: number | null
  price_fortnightly: number | null
  price_monthly: number | null
  is_sold_out: boolean
  cover_photo: { url: string } | null
  listing_vehicles: { vehicle: VehicleType }[]
}

interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}


const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  drive_away: 'Drive Away',
  lockup_garage: 'Lockup Garage',
  unsheltered: 'Unsheltered',
  sheltered: 'Sheltered',
  indoor_lot: 'Indoor Lot',
}

const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 }
const DEFAULT_ZOOM = 13
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'

// Rendered inside <Map> so useMap() can access the map instance.
function MapController({ searchLocation }: { searchLocation: { lat: number; lng: number } | null }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !searchLocation) return
    map.panTo(searchLocation)
    map.setZoom(DEFAULT_ZOOM)
  }, [map, searchLocation])

  return null
}

function cheapestPrice(
  daily: number | null,
  fortnightly: number | null,
  monthly: number | null
): { amount: number; label: string } | null {
  if (daily !== null) return { amount: daily, label: '/day' }
  if (monthly !== null) return { amount: monthly, label: '/mo' }
  if (fortnightly !== null) return { amount: fortnightly, label: '/fn' }
  return null
}

// ─── Map inner component (rendered inside APIProvider) ────────────────────────

interface ListingsMapInnerProps {
  initialListings: MapListing[]
  initialCenter: { lat: number; lng: number }
  searchLocation: { lat: number; lng: number } | null
  filters: Record<string, string | string[] | undefined>
  hoveredListingId: string | null
  selectedListingId: string | null
  onMarkerClick: (id: string) => void
  onDeselect: () => void
  onMarkerHover: (id: string | null) => void
  onListingsChange: (listings: MapListing[]) => void
}

function ListingsMapInner({
  initialListings,
  initialCenter,
  searchLocation,
  filters,
  hoveredListingId,
  selectedListingId,
  onMarkerClick,
  onDeselect,
  onMarkerHover,
  onListingsChange,
}: ListingsMapInnerProps) {
  const [markers, setMarkers] = useState<MapListing[]>(initialListings)
  const [infoListing, setInfoListing] = useState<MapListing | null>(null)
  const isMounted = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestBounds = useRef<MapBounds | null>(null)
  const router = useRouter()

  const fetchForBounds = useCallback(
    async (bounds: MapBounds) => {
      const params = new URLSearchParams()
      params.set('ne_lat', String(bounds.north))
      params.set('ne_lng', String(bounds.east))
      params.set('sw_lat', String(bounds.south))
      params.set('sw_lng', String(bounds.west))
      params.set('limit', '200')

      // Forward current filters (except page/view/bounds)
      for (const [key, val] of Object.entries(filters)) {
        if (!val || key === 'page' || key === 'view') continue
        if (Array.isArray(val)) val.forEach((v) => params.append(key, v))
        else params.set(key, val)
      }

      try {
        const res = await fetch(`/api/listings?${params.toString()}`)
        if (!res.ok) return
        const json = await res.json()
        const fetched: MapListing[] = (json.listings ?? []).map((l: MapListing & { listing_photos?: unknown }) => ({
          ...l,
          listing_vehicles: l.listing_vehicles ?? [],
        }))
        setMarkers(fetched)
        onListingsChange(fetched)
      } catch {
        // silently ignore fetch errors on bounds change
      }
    },
    [filters, onListingsChange]
  )

  const handleBoundsChanged = useCallback(
    (ev: MapCameraChangedEvent) => {
      const bounds = ev.detail.bounds as MapBounds
      latestBounds.current = bounds

      if (!isMounted.current) {
        isMounted.current = true
        return // skip the first bounds event fired on mount
      }

      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        const b = latestBounds.current
        if (!b) return

        // Update URL so viewport bounds become the active spatial filter.
        // Clear lat/lng — the map viewport takes over.
        const params = new URLSearchParams(window.location.search)
        params.set('ne_lat', String(b.north))
        params.set('ne_lng', String(b.east))
        params.set('sw_lat', String(b.south))
        params.set('sw_lng', String(b.west))
        params.delete('lat')
        params.delete('lng')
        router.replace(`/listings?${params.toString()}`, { scroll: false })

        fetchForBounds(b)
      }, 600)
    },
    [fetchForBounds, router]
  )

  // Sync markers when initialListings changes (filter applied → new SSR data)
  useEffect(() => {
    setMarkers(initialListings)
    onListingsChange(initialListings)
  }, [initialListings]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch for current bounds when filters change (map already rendered)
  useEffect(() => {
    if (!isMounted.current || !latestBounds.current) return
    fetchForBounds(latestBounds.current)
  }, [fetchForBounds])

  // Sync infoListing when selectedListingId changes
  useEffect(() => {
    if (selectedListingId) {
      const found = markers.find((m) => m.id === selectedListingId) ?? null
      setInfoListing(found)
    } else {
      setInfoListing(null)
    }
  }, [selectedListingId, markers])

  const handleMarkerClick = useCallback(
    (listing: MapListing) => {
      onMarkerClick(listing.id)
    },
    [onMarkerClick]
  )

  return (
    <Map
      defaultCenter={initialCenter}
      defaultZoom={DEFAULT_ZOOM}
      mapId={MAP_ID}
      onBoundsChanged={handleBoundsChanged}
      gestureHandling="greedy"
      disableDefaultUI={false}
      className="w-full h-full"
    >
      <MapController searchLocation={searchLocation} />

      {markers.map((listing) => {
        const price = cheapestPrice(listing.price_daily, listing.price_fortnightly, listing.price_monthly)
        const isHovered = hoveredListingId === listing.id
        const isSelected = selectedListingId === listing.id

        return (
          <AdvancedMarker
            key={listing.id}
            position={{ lat: listing.lat, lng: listing.lng }}
            onClick={() => handleMarkerClick(listing)}
            zIndex={isSelected ? 10 : isHovered ? 5 : 1}
          >
            <div
              onMouseEnter={() => onMarkerHover(listing.id)}
              onMouseLeave={() => onMarkerHover(null)}
            >
              <PriceMarker
                price={price}
                isHovered={isHovered}
                isSelected={isSelected}
                isSoldOut={listing.is_sold_out}
              />
            </div>
          </AdvancedMarker>
        )
      })}

      {infoListing && (
        <InfoWindow
          position={{ lat: infoListing.lat, lng: infoListing.lng }}
          onCloseClick={onDeselect}
          headerDisabled
        >
          <InfoCard listing={infoListing} />
        </InfoWindow>
      )}
    </Map>
  )
}

// ─── InfoWindow mini-card ─────────────────────────────────────────────────────

function InfoCard({ listing }: { listing: MapListing }) {
  const price = cheapestPrice(listing.price_daily, listing.price_fortnightly, listing.price_monthly)

  return (
    <Link href={`/listings/${listing.id}`} className="block w-60 no-underline group">
      {/* Photo */}
      <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-muted mb-2">
        {listing.cover_photo ? (
          <Image
            src={listing.cover_photo.url}
            alt={listing.title}
            fill
            sizes="240px"
            className="object-cover group-hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
        {listing.is_sold_out && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="destructive" className="text-xs">Sold Out</Badge>
          </div>
        )}
      </div>

      {/* Details */}
      <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground mb-1">
        {listing.title}
      </p>
      <p className="text-xs text-muted-foreground mb-1.5">
        {listing.suburb}, {listing.state}
      </p>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="text-xs shrink-0">
          {SPACE_TYPE_LABELS[listing.space_type]}
        </Badge>
        {price && (
          <span className="text-sm font-bold text-primary whitespace-nowrap">
            ${price.amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <span className="text-xs font-normal text-muted-foreground">{price.label}</span>
          </span>
        )}
      </div>
      <p className="text-xs text-primary mt-2 group-hover:underline">View listing →</p>
    </Link>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────
// No APIProvider here — the app-wide GoogleMapsProvider in the root layout
// supplies the single Maps JS API script load (libraries: ['places', 'marker']).

export interface ListingsMapProps {
  initialListings: MapListing[]
  filters: Record<string, string | string[] | undefined>
  searchLocation?: { lat: number; lng: number } | null
  hoveredListingId: string | null
  selectedListingId: string | null
  onMarkerClick: (id: string) => void
  onDeselect: () => void
  onMarkerHover: (id: string | null) => void
  onListingsChange: (listings: MapListing[]) => void
}

export function ListingsMap(props: ListingsMapProps) {
  const latParam = props.filters.lat
  const lngParam = props.filters.lng
  const lat = typeof latParam === 'string' ? Number(latParam) : NaN
  const lng = typeof lngParam === 'string' ? Number(lngParam) : NaN
  const initialCenter =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : MELBOURNE_CENTER

  return (
    <div className="w-full h-full">
      <ListingsMapInner
        {...props}
        initialCenter={initialCenter}
        searchLocation={props.searchLocation ?? null}
      />
    </div>
  )
}
