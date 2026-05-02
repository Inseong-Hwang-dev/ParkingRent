'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  MapPin,
  X,
  Trash2,
  GripVertical,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PlacesAutocomplete, type PlaceResult } from '@/components/listings/places-autocomplete'
import { PhotoUploader } from '@/components/listings/photo-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { SpaceType, VehicleType, FeatureType } from '@/types/database'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  'Basic Info',
  'Location',
  'Space Details',
  'Pricing',
  'Photos',
  'Access Info',
] as const

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

// ─── Types ───────────────────────────────────────────────────────────────────

type ExistingPhoto = {
  id: string
  url: string
  sort_order: number
}

type InitialData = {
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
  price_fortnightly: number | null
  price_monthly: number | null
  access_instructions: string | null
  photos: ExistingPhoto[]
}

type FormState = {
  title: string
  description: string
  address: string
  suburb: string
  state: string
  postcode: string
  lat: number | null
  lng: number | null
  space_type: SpaceType | ''
  vehicles: VehicleType[]
  features: FeatureType[]
  daily_enabled: boolean
  price_daily: string
  fortnightly_enabled: boolean
  price_fortnightly: string
  monthly_enabled: boolean
  price_monthly: string
  access_instructions: string
}

type Errors = Partial<Record<keyof FormState | '_pricing', string>>

// ─── Validation ──────────────────────────────────────────────────────────────

function validateStep(step: number, form: FormState): Errors {
  const errors: Errors = {}

  if (step === 0) {
    if (!form.title.trim()) errors.title = 'Title is required'
    else if (form.title.trim().length < 5) errors.title = 'Title must be at least 5 characters'
  }

  if (step === 1) {
    if (!form.address.trim()) errors.address = 'Address is required'
    else if (form.lat === null || form.lng === null)
      errors.address = 'Please select an address from the suggestions'
    if (!form.suburb) errors.suburb = 'Select an address from the dropdown to populate suburb'
  }

  if (step === 2) {
    if (!form.space_type) errors.space_type = 'Please select a space type'
    if (form.vehicles.length === 0) errors.vehicles = 'Select at least one vehicle type'
  }

  if (step === 3) {
    const anyEnabled = form.daily_enabled || form.fortnightly_enabled || form.monthly_enabled
    if (!anyEnabled) {
      errors._pricing = 'Enable at least one pricing option'
    } else {
      if (form.daily_enabled) {
        const v = parseFloat(form.price_daily)
        if (!form.price_daily || isNaN(v) || v <= 0) errors.price_daily = 'Enter a valid daily price'
      }
      if (form.fortnightly_enabled) {
        const v = parseFloat(form.price_fortnightly)
        if (!form.price_fortnightly || isNaN(v) || v <= 0)
          errors.price_fortnightly = 'Enter a valid fortnightly price'
      }
      if (form.monthly_enabled) {
        const v = parseFloat(form.price_monthly)
        if (!form.price_monthly || isNaN(v) || v <= 0) errors.price_monthly = 'Enter a valid monthly price'
      }
    }
  }

  return errors
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm sm:hidden">
        <span className="font-medium">{STEPS[current]}</span>
        <span className="text-muted-foreground">
          {current + 1} of {total}
        </span>
      </div>
      <ol className="hidden sm:flex items-center gap-1" aria-label="Form progress">
        {STEPS.map((label, index) => {
          const done = index < current
          const active = index === current
          return (
            <li key={label} className="flex items-center gap-1">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-border" aria-hidden />}
            </li>
          )
        })}
      </ol>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%` }}
          aria-hidden
        />
      </div>
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
              enabled ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-muted'
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

// ─── Sortable photo item ──────────────────────────────────────────────────────

function SortablePhoto({
  photo,
  index,
  onDelete,
  isDeleting,
}: {
  photo: ExistingPhoto
  index: number
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn('relative aspect-square group', isDragging && 'z-10 opacity-75')}
    >
      <div className="relative h-full w-full overflow-hidden rounded-md border bg-muted">
        <Image
          src={photo.url}
          alt={`Photo ${index + 1}`}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
          className="object-cover"
        />
        {index === 0 && (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
            Cover
          </span>
        )}
        {/* Drag handle */}
        <button
          type="button"
          className={cn(
            'absolute left-1 top-1 flex h-5 w-5 cursor-grab items-center justify-center rounded bg-black/50 text-white active:cursor-grabbing',
            'opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100'
          )}
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => onDelete(photo.id)}
        disabled={isDeleting}
        className={cn(
          'absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full',
          'bg-destructive text-white shadow-sm',
          'opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100',
          isDeleting && 'opacity-100'
        )}
        aria-label={`Delete photo ${index + 1}`}
      >
        {isDeleting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </button>
    </li>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EditListingForm({
  listingId,
  initialData,
}: {
  listingId: string
  initialData: InitialData
}) {
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>({
    title: initialData.title,
    description: initialData.description ?? '',
    address: initialData.address,
    suburb: initialData.suburb,
    state: initialData.state,
    postcode: initialData.postcode,
    lat: initialData.lat,
    lng: initialData.lng,
    space_type: initialData.space_type,
    vehicles: initialData.vehicles,
    features: initialData.features,
    daily_enabled: initialData.price_daily !== null,
    price_daily: initialData.price_daily?.toString() ?? '',
    fortnightly_enabled: initialData.price_fortnightly !== null,
    price_fortnightly: initialData.price_fortnightly?.toString() ?? '',
    monthly_enabled: initialData.price_monthly !== null,
    price_monthly: initialData.price_monthly?.toString() ?? '',
    access_instructions: initialData.access_instructions ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>(initialData.photos)
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }, [])

  const toggleArrayItem = useCallback(<T extends string>(key: 'vehicles' | 'features', value: T) => {
    setForm((prev) => {
      const arr = prev[key] as T[]
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...prev, [key]: next }
    })
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }, [])

  const handlePlaceSelect = useCallback((place: PlaceResult) => {
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
  }, [])

  const handleDeleteExistingPhoto = useCallback(
    async (photoId: string) => {
      setDeletingPhotoId(photoId)
      try {
        const res = await fetch(`/api/listings/${listingId}/photos`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId }),
        })
        if (!res.ok) throw new Error('Failed to delete photo')
        setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId))
      } catch {
        toast.error('Failed to delete photo. Please try again.')
      } finally {
        setDeletingPhotoId(null)
      }
    },
    [listingId]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      setExistingPhotos((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id)
        const newIndex = prev.findIndex((p) => p.id === over.id)
        const reordered = arrayMove(prev, oldIndex, newIndex).map((p, i) => ({
          ...p,
          sort_order: i,
        }))

        fetch(`/api/listings/${listingId}/photos`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos: reordered.map(({ id, sort_order }) => ({ id, sort_order })),
          }),
        }).catch(() => toast.error('Failed to save photo order'))

        return reordered
      })
    },
    [listingId]
  )

  const handleNewPhotosChange = useCallback(
    (files: File[]) => {
      const max = 10 - existingPhotos.length
      setNewPhotos(files.slice(0, max))
    },
    [existingPhotos.length]
  )

  const handleDeleteListing = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Failed to delete listing')
      }
      toast.success('Listing deleted')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setIsDeleting(false)
    }
  }

  const goNext = () => {
    const errs = validateStep(step, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStep((s) => s + 1)
  }

  const goBack = () => {
    setErrors({})
    setStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    const errs = validateStep(step, form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          price_fortnightly: form.fortnightly_enabled ? parseFloat(form.price_fortnightly) : null,
          price_monthly: form.monthly_enabled ? parseFloat(form.price_monthly) : null,
          access_instructions: form.access_instructions.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Failed to update listing')
      }

      for (const file of newPhotos) {
        const fd = new FormData()
        fd.append('file', file)
        const photoRes = await fetch(`/api/listings/${listingId}/photos`, {
          method: 'POST',
          body: fd,
        })
        if (!photoRes.ok) {
          const data = await photoRes.json().catch(() => ({}))
          console.error('Photo upload failed:', (data as { error?: string }).error)
        }
      }

      toast.success('Listing updated successfully!')
      router.push(`/listings/${listingId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Step content ─────────────────────────────────────────────────────────

  const totalPhotoCount = existingPhotos.length + newPhotos.length

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
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
          </div>
        )

      case 1:
        return (
          <div className="space-y-5">
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
                  if (form.lat !== null) {
                    setForm((prev) => ({ ...prev, lat: null, lng: null }))
                  }
                }}
                onPlaceSelect={handlePlaceSelect}
                error={errors.address}
              />
            </div>
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
            {errors.suburb && !errors.address && <FieldError message={errors.suburb} />}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
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
                      form.space_type === value ? 'border-primary bg-primary/5' : 'border-input'
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
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>
                Pricing <span className="text-destructive">*</span>
              </Label>
              <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
                Enable one or more pricing options. All amounts are in AUD.
              </p>
            </div>
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
              label="Fortnightly"
              period="per fortnight"
              enabled={form.fortnightly_enabled}
              onToggle={() => update('fortnightly_enabled', !form.fortnightly_enabled)}
              value={form.price_fortnightly}
              onChange={(v) => update('price_fortnightly', v)}
              error={errors.price_fortnightly}
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
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>Photos</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Drag to reorder. The first photo is the cover. Maximum 10 photos total.
              </p>
            </div>

            {/* Existing photos with drag-and-drop */}
            {existingPhotos.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Current photos</p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={existingPhotos.map((p) => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                      {existingPhotos.map((photo, index) => (
                        <SortablePhoto
                          key={photo.id}
                          photo={photo}
                          index={index}
                          onDelete={handleDeleteExistingPhoto}
                          isDeleting={deletingPhotoId === photo.id}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Add new photos */}
            {totalPhotoCount < 10 && (
              <div>
                {existingPhotos.length > 0 && (
                  <p className="text-sm font-medium mb-2">Add more photos</p>
                )}
                <PhotoUploader files={newPhotos} onChange={handleNewPhotosChange} />
              </div>
            )}

            {totalPhotoCount >= 10 && (
              <p className="text-xs text-muted-foreground">
                Maximum 10 photos reached. Delete existing photos to add new ones.
              </p>
            )}

            <p className="text-xs text-muted-foreground text-right">
              {totalPhotoCount} / 10 photos
            </p>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="access_instructions">Access Instructions</Label>
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
          </div>
        )

      default:
        return null
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Listing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the details for your parking space.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting || isSubmitting}
              className="shrink-0 gap-1.5 text-destructive hover:border-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete Listing
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your listing and all its photos. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteListing}
                className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
              >
                Delete listing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mb-8">
        <StepIndicator current={step} total={STEPS.length} />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold">{STEPS[step]}</h2>
        {renderStep()}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step === 0 || isSubmitting}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext} className="gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
