'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bike,
  Car,
  Truck,
  Bus,
  Clock,
  Camera,
  Accessibility,
  Zap,
  Shield,
  CalendarCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import type { SpaceType, VehicleType, FeatureType } from '@/types/database'

// ─── Constants ────────────────────────────────────────────────────────────────

const SPACE_TYPES: { value: SpaceType; label: string }[] = [
  { value: 'drive_away',     label: 'Drive Away' },
  { value: 'lockup_garage',  label: 'Lockup Garage' },
  { value: 'unsheltered',    label: 'Unsheltered' },
  { value: 'sheltered',      label: 'Sheltered' },
  { value: 'indoor_lot',     label: 'Indoor Lot' },
]

const VEHICLE_TYPES: { value: VehicleType; label: string; Icon: React.ElementType }[] = [
  { value: 'motorcycle',  label: 'Motorcycle',   Icon: Bike },
  { value: 'small_car',   label: 'Small Car',    Icon: Car },
  { value: 'suv',         label: 'SUV',          Icon: Car },
  { value: 'van',         label: 'Van',          Icon: Bus },
  { value: 'small_truck', label: 'Small Truck',  Icon: Truck },
  { value: 'large_truck', label: 'Large Truck',  Icon: Truck },
]

const FEATURES: { value: FeatureType; label: string; Icon: React.ElementType }[] = [
  { value: 'access_247',     label: '24/7 Access',     Icon: Clock },
  { value: 'cctv',           label: 'CCTV',            Icon: Camera },
  { value: 'disabled_access',label: 'Disabled Access', Icon: Accessibility },
  { value: 'ev_charging',    label: 'EV Charging',     Icon: Zap },
  { value: 'instant_booking',label: 'Instant Booking', Icon: CalendarCheck },
  { value: 'security',       label: 'Security',        Icon: Shield },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest',     label: 'Newest' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'featured',   label: 'Featured first' },
]

const PRICE_MAX_LIMIT = 500

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterParams {
  location?:   string
  search?:     string
  space_type?: string | string[]
  vehicles?:   string | string[]
  features?:   string | string[]
  min_price?:  string
  max_price?:  string
  sort?:       string
  lat?:        string
  lng?:        string
  ne_lat?:     string
  ne_lng?:     string
  sw_lat?:     string
  sw_lng?:     string
  page?:       string
  view?:       string
}

interface DraftState {
  spaceTypes: SpaceType[]
  vehicles:   VehicleType[]
  features:   FeatureType[]
  minPrice:   string
  maxPrice:   string
  sort:       string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

function buildUrl(base: FilterParams, draft: DraftState): string {
  const params = new URLSearchParams()

  const location = base.location ?? base.search
  if (location)   params.set('location', location)
  if (base.view)  params.set('view',     base.view)
  if (base.lat)   params.set('lat',      base.lat)
  if (base.lng)   params.set('lng',      base.lng)

  draft.spaceTypes.forEach((v) => params.append('space_type', v))
  draft.vehicles.forEach((v)   => params.append('vehicles',   v))
  draft.features.forEach((v)   => params.append('features',   v))

  if (draft.minPrice) params.set('min_price', draft.minPrice)
  if (draft.maxPrice) params.set('max_price', draft.maxPrice)
  if (draft.sort && draft.sort !== 'newest') params.set('sort', draft.sort)

  params.set('page', '1')
  return `/listings?${params.toString()}`
}

function countActive(params: FilterParams): number {
  return (
    toArray(params.space_type).length +
    toArray(params.vehicles).length +
    toArray(params.features).length +
    (params.min_price ? 1 : 0) +
    (params.max_price ? 1 : 0)
  )
}

function initDraft(params: FilterParams): DraftState {
  return {
    spaceTypes: toArray(params.space_type) as SpaceType[],
    vehicles:   toArray(params.vehicles)   as VehicleType[],
    features:   toArray(params.features)   as FeatureType[],
    minPrice:   params.min_price ?? '',
    maxPrice:   params.max_price ?? '',
    sort:       params.sort      ?? 'newest',
  }
}

// ─── Filter Form (shared between sidebar and dialog) ──────────────────────────

interface FilterFormProps {
  draft: DraftState
  onChange: (next: DraftState) => void
}

function FilterForm({ draft, onChange }: FilterFormProps) {
  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  return (
    <div className="space-y-5">
      {/* Sort */}
      <div>
        <p className="text-sm font-semibold mb-2">Sort by</p>
        <div className="space-y-1.5">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...draft, sort: value })}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors text-left ${
                draft.sort === value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Space Type */}
      <div>
        <p className="text-sm font-semibold mb-2">Space Type</p>
        <div className="space-y-1.5">
          {SPACE_TYPES.map(({ value, label }) => {
            const active = draft.spaceTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...draft, spaceTypes: toggle(draft.spaceTypes, value) })}
                className="flex w-full items-center gap-2.5 text-sm text-left"
              >
                <span
                  className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center ${
                    active ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  }`}
                >
                  {active && (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Vehicle Type */}
      <div>
        <p className="text-sm font-semibold mb-2">Vehicle Type</p>
        <div className="grid grid-cols-2 gap-1.5">
          {VEHICLE_TYPES.map(({ value, label, Icon }) => {
            const active = draft.vehicles.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...draft, vehicles: toggle(draft.vehicles, value) })}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Features */}
      <div>
        <p className="text-sm font-semibold mb-2">Features</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FEATURES.map(({ value, label, Icon }) => {
            const active = draft.features.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...draft, features: toggle(draft.features, value) })}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <p className="text-sm font-semibold mb-2">Price (per day AUD)</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Min</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min={0}
                max={PRICE_MAX_LIMIT}
                step={5}
                placeholder="0"
                value={draft.minPrice}
                onChange={(e) => onChange({ ...draft, minPrice: e.target.value })}
                className="w-full rounded-md border border-input bg-background pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <span className="text-muted-foreground mt-5">–</span>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Max</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min={0}
                max={PRICE_MAX_LIMIT}
                step={5}
                placeholder="500"
                value={draft.maxPrice}
                onChange={(e) => onChange({ ...draft, maxPrice: e.target.value })}
                className="w-full rounded-md border border-input bg-background pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Public component ──────────────────────────────────────────────────────────

interface FilterPanelProps {
  currentParams: FilterParams
  showSidebar?: boolean // true = desktop aside visible; false = button-only (e.g. map view)
}

export function FilterPanel({ currentParams, showSidebar = true }: FilterPanelProps) {
  const router     = useRouter()
  const [open, setOpen]   = useState(false)
  const [draft, setDraft] = useState<DraftState>(() => initDraft(currentParams))

  const activeCount = countActive(currentParams)

  const handleApply = useCallback(() => {
    router.push(buildUrl(currentParams, draft))
    setOpen(false)
  }, [router, currentParams, draft])

  const handleReset = useCallback(() => {
    const empty: DraftState = {
      spaceTypes: [],
      vehicles:   [],
      features:   [],
      minPrice:   '',
      maxPrice:   '',
      sort:       'newest',
    }
    setDraft(empty)
    router.push(buildUrl(currentParams, empty))
    setOpen(false)
  }, [router, currentParams])

  const isDirty =
    draft.spaceTypes.length > 0 ||
    draft.vehicles.length   > 0 ||
    draft.features.length   > 0 ||
    draft.minPrice !== '' ||
    draft.maxPrice !== '' ||
    draft.sort !== 'newest'

  const actionBar = (
    <div className="flex gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={handleReset}
        disabled={!isDirty}
      >
        Reset
      </Button>
      <Button size="sm" className="flex-1" onClick={handleApply}>
        Apply
      </Button>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar (list view only) ── */}
      {showSidebar && (
        <aside className="hidden md:flex flex-col w-64 shrink-0">
          <div className="sticky top-[4.5rem] max-h-[calc(100vh-5rem)] overflow-y-auto space-y-1 pr-1">
            <FilterForm
              draft={draft}
              onChange={setDraft}
            />
            {actionBar}
          </div>
        </aside>
      )}

      {/* ── Trigger button (mobile always; desktop when no sidebar) ── */}
      <div className={showSidebar ? 'md:hidden' : ''}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-0.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* ── Mobile / map-view dialog (bottom sheet) ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-auto bottom-0 left-[50%] translate-x-[-50%] translate-y-0 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl rounded-b-none p-5"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-center justify-between mb-4">
            <DialogTitle className="text-base">Filters & Sort</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <FilterForm
            draft={draft}
            onChange={setDraft}
          />
          <div className="pt-4 pb-2">{actionBar}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}
