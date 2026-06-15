'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Check, MapPin } from 'lucide-react'
import { createListing } from '@/app/(dashboard)/listings/new/actions'
import { PlacesAutocomplete, type PlaceResult } from '@/components/listings/places-autocomplete'
import { PhotoUploader } from '@/components/listings/photo-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SpaceType, VehicleType, FeatureType } from '@/types/database'

// ─── Constants ───────────────────────────────────────────────────────────────

const SPACE_TYPES: { value: SpaceType; label: string; description: string }[] = [
  { value: 'drive_away', label: 'Drive Away', description: 'Open driveway with direct street access' },
  { value: 'lockup_garage', label: 'Lockup Garage', description: 'Enclosed garage with a lockable door' },
  { value: 'unsheltered', label: 'Unsheltered', description: 'Outdoor space, no roof cover' },
  { value: 'sheltered', label: 'Sheltered', description: 'Covered but not fully enclosed' },
  { value: 'indoor_lot', label: 'Indoor Lot', description: 'Multi-storey or basement car park' },
]

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'small_car', label: 'Small Car' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'small_truck', label: 'Small Truck' },
  { value: 'large_truck', label: 'Large Truck' },
]

const FEATURES: { value: FeatureType; label: string }[] = [
  { value: 'access_247', label: '24/7 Access' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'disabled_access', label: 'Disabled Access' },
  { value: 'ev_charging', label: 'EV Charging' },
  { value: 'instant_booking', label: 'Instant Booking' },
  { value: 'security', label: 'Security' },
]

// ─── Form State ──────────────────────────────────────────────────────────────

type FormState = {
  title: string
  description: string
  // Location
  address: string
  suburb: string
  state: string
  postcode: string
  lat: number | null
  lng: number | null
  // Space Details
  space_type: SpaceType | ''
  vehicles: VehicleType[]
  features: FeatureType[]
  // Pricing
  daily_enabled: boolean
  price_daily: string
  weekly_enabled: boolean
  price_weekly: string
  monthly_enabled: boolean
  price_monthly: string
  // Access
  access_instructions: string
}

const INITIAL_STATE: FormState = {
  title: '',
  description: '',
  address: '',
  suburb: '',
  state: '',
  postcode: '',
  lat: null,
  lng: null,
  space_type: '',
  vehicles: [],
  features: [],
  daily_enabled: false,
  price_daily: '',
  weekly_enabled: false,
  price_weekly: '',
  monthly_enabled: true,
  price_monthly: '',
  access_instructions: '',
}

// ─── Validation ──────────────────────────────────────────────────────────────

type Errors = Partial<Record<keyof FormState | '_pricing', string>>

function validateForm(form: FormState): Errors {
  const errors: Errors = {}

  if (!form.title.trim()) errors.title = 'Title is required'
  else if (form.title.trim().length < 5) errors.title = 'Title must be at least 5 characters'

  if (!form.address.trim()) errors.address = 'Address is required'
  else if (form.lat === null || form.lng === null)
    errors.address = 'Please select an address from the suggestions'
  if (!form.suburb) errors.suburb = 'Select an address from the dropdown to populate suburb'

  if (!form.space_type) errors.space_type = 'Please select a space type'
  if (form.vehicles.length === 0)
    errors.vehicles = 'Select at least one vehicle type'

  const anyEnabled = form.daily_enabled || form.weekly_enabled || form.monthly_enabled
  if (!anyEnabled) {
    errors._pricing = 'Enable at least one pricing option'
  } else {
    if (form.daily_enabled) {
      const v = parseFloat(form.price_daily)
      if (!form.price_daily || isNaN(v) || v <= 0)
        errors.price_daily = 'Enter a valid daily price'
    }
    if (form.weekly_enabled) {
      const v = parseFloat(form.price_weekly)
      if (!form.price_weekly || isNaN(v) || v <= 0)
        errors.price_weekly = 'Enter a valid weekly price'
    }
    if (form.monthly_enabled) {
      const v = parseFloat(form.price_monthly)
      if (!form.price_monthly || isNaN(v) || v <= 0)
        errors.price_monthly = 'Enter a valid monthly price'
    }
  }

  return errors
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="shrink-0 text-base font-semibold">{title}</h2>
      <Separator className="flex-1" />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function CheckboxItem({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-primary"
      />
      {label}
    </label>
  )
}

function PricingRow({
  label,
  period,
  enabled,
  onToggle,
  value,
  onChange,
  error,
}: {
  label: string
  period: string
  enabled: boolean
  onToggle: () => void
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className={cn('rounded-lg border p-4 transition-colors', enabled && 'border-primary bg-primary/5')}>
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-3 select-none">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={onToggle}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors',
              enabled
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/40 bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </button>
          <span className="font-medium text-sm">{label}</span>
        </label>
        <span className="text-xs text-muted-foreground">{period}</span>
      </div>

      {enabled && (
        <div className="mt-3">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={cn('pl-6', error && 'border-destructive focus-visible:ring-destructive/20')}
              aria-label={`${label} price in AUD`}
            />
          </div>
          <FieldError message={error} />
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ListingForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [errors, setErrors] = useState<Errors>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    },
    []
  )

  const toggleArrayItem = useCallback(
    <T extends string>(key: 'vehicles' | 'features', value: T) => {
      setForm((prev) => {
        const arr = prev[key] as T[]
        const next = arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value]
        return { ...prev, [key]: next }
      })
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    },
    []
  )

  const handlePlaceSelect = useCallback(
    (place: PlaceResult) => {
      setForm((prev) => ({
        ...prev,
        address: place.address,
        suburb: place.suburb,
        state: place.state,
        postcode: place.postcode,
        lat: place.lat,
        lng: place.lng,
      }))
      setErrors((prev) => ({ ...prev, address: undefined, suburb: undefined }))
    },
    []
  )

  const handleSubmit = async () => {
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setIsSubmitting(true)
    try {
      const { listingId } = await createListing({
        title: form.title.trim(),
        description: form.description.trim() || null,
        address: form.address,
        suburb: form.suburb,
        state: form.state,
        postcode: form.postcode,
        lat: form.lat!,
        lng: form.lng!,
        space_type: form.space_type as SpaceType,
        vehicles: form.vehicles,
        features: form.features,
        price_daily: form.daily_enabled ? parseFloat(form.price_daily) : null,
        price_weekly: form.weekly_enabled
          ? parseFloat(form.price_weekly)
          : null,
        price_monthly: form.monthly_enabled ? parseFloat(form.price_monthly) : null,
        access_instructions: form.access_instructions.trim() || null,
      })

      // Upload photos sequentially
      for (const file of photos) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/listings/${listingId}/photos`, {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          console.error('Photo upload failed:', data.error)
          // Non-fatal — listing is created; user can add photos later
        }
      }

      toast.success('Listing created successfully!')
      router.push('/dashboard')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // APIProvider is supplied by the app-wide GoogleMapsProvider in the root layout.
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">List Your Space</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details below to publish your parking space.
        </p>
      </div>

      <div className="space-y-8">
        {/* ── Basic Info ── */}
        <section className="space-y-5">
          <SectionHeading title="Basic Info" />

          <div>
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Secure undercover spot in South Yarra"
              className={cn('mt-1.5', errors.title && 'border-destructive')}
              maxLength={120}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe access, nearby landmarks, any relevant details…"
              rows={4}
              className="mt-1.5 resize-none"
              maxLength={1000}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {form.description.length} / 1000
            </p>
          </div>
        </section>

        {/* ── Location ── */}
        <section className="space-y-5">
          <SectionHeading title="Location" />

          <div>
            <Label htmlFor="address">
              Address <span className="text-destructive">*</span>
            </Label>
            <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
              Type your address and select from the suggestions to fill in the details below.
            </p>
            <PlacesAutocomplete
              value={form.address}
              onChange={(v) => {
                update('address', v)
                // If user manually edits after selecting, clear coordinates
                if (form.lat !== null) {
                  setForm((prev) => ({ ...prev, lat: null, lng: null }))
                }
              }}
              onPlaceSelect={handlePlaceSelect}
              error={errors.address}
            />
          </div>

          {/* Parsed address fields (read-only) */}
          {(form.suburb || form.state || form.postcode) && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Suburb</p>
                    <p className="font-medium">{form.suburb || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">State</p>
                    <p className="font-medium">{form.state || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Postcode</p>
                    <p className="font-medium">{form.postcode || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {errors.suburb && !errors.address && (
            <FieldError message={errors.suburb} />
          )}
        </section>

        {/* ── Space Details ── */}
        <section className="space-y-6">
          <SectionHeading title="Space Details" />

          {/* Space type */}
          <div>
            <Label>
              Space Type <span className="text-destructive">*</span>
            </Label>
            <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
              Choose the option that best describes your space.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SPACE_TYPES.map(({ value, label, description }) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50',
                    form.space_type === value
                      ? 'border-primary bg-primary/5'
                      : 'border-input'
                  )}
                >
                  <input
                    type="radio"
                    name="space_type"
                    value={value}
                    checked={form.space_type === value}
                    onChange={() => update('space_type', value)}
                    className="mt-0.5 shrink-0 accent-primary"
                  />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </label>
              ))}
            </div>
            <FieldError message={errors.space_type} />
          </div>

          {/* Vehicle types */}
          <div>
            <Label>
              Suitable For <span className="text-destructive">*</span>
            </Label>
            <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
              Select all vehicle types that fit in your space.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VEHICLE_TYPES.map(({ value, label }) => (
                <CheckboxItem
                  key={value}
                  checked={form.vehicles.includes(value)}
                  onChange={() => toggleArrayItem('vehicles', value)}
                  label={label}
                />
              ))}
            </div>
            <FieldError message={errors.vehicles} />
          </div>

          {/* Features */}
          <div>
            <Label>Features</Label>
            <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
              Optional — tick any that apply.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FEATURES.map(({ value, label }) => (
                <CheckboxItem
                  key={value}
                  checked={form.features.includes(value)}
                  onChange={() => toggleArrayItem('features', value)}
                  label={label}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="space-y-4">
          <SectionHeading title="Pricing" />

          <p className="text-xs text-muted-foreground">
            Enable one or more pricing options. All amounts are in AUD.
          </p>

          {errors._pricing && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors._pricing}
            </p>
          )}

          <PricingRow
            label="Daily"
            period="per day"
            enabled={form.daily_enabled}
            onToggle={() => update('daily_enabled', !form.daily_enabled)}
            value={form.price_daily}
            onChange={(v) => update('price_daily', v)}
            error={errors.price_daily}
          />
          <PricingRow
            label="Weekly"
            period="per week"
            enabled={form.weekly_enabled}
            onToggle={() => update('weekly_enabled', !form.weekly_enabled)}
            value={form.price_weekly}
            onChange={(v) => update('price_weekly', v)}
            error={errors.price_weekly}
          />
          <PricingRow
            label="Monthly"
            period="per month"
            enabled={form.monthly_enabled}
            onToggle={() => update('monthly_enabled', !form.monthly_enabled)}
            value={form.price_monthly}
            onChange={(v) => update('price_monthly', v)}
            error={errors.price_monthly}
          />
        </section>

        {/* ── Photos ── */}
        <section className="space-y-4">
          <SectionHeading title="Photos" />

          <p className="text-xs text-muted-foreground">
            Add up to 10 photos. The first photo will be used as the cover image. You can add or change photos after publishing.
          </p>
          <PhotoUploader files={photos} onChange={setPhotos} />
        </section>

        {/* ── Access Instructions ── */}
        <section className="space-y-4">
          <SectionHeading title="Access Instructions" />

          <div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              These details are only shown to the renter after a booking is accepted — not publicly visible.
            </p>
            <Textarea
              id="access_instructions"
              value={form.access_instructions}
              onChange={(e) => update('access_instructions', e.target.value)}
              placeholder="e.g. Enter via the rear laneway. Gate code is 1234. Space is marked B2."
              rows={5}
              className="mt-1.5 resize-none"
              maxLength={2000}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {form.access_instructions.length} / 2000
            </p>
          </div>
        </section>
      </div>

      {/* Submit */}
      <div className="mt-8 flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Create Listing
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
