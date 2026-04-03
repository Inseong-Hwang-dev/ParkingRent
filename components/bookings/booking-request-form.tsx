'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PricingType } from '@/types/database'

const PRICING_LABELS: Record<PricingType, string> = {
  daily: 'Daily',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

interface BookingRequestFormProps {
  listingId: string
  isSoldOut: boolean
  isOwner: boolean
  availablePricing: { type: PricingType; price: number }[]
}

export function BookingRequestForm({
  listingId,
  isSoldOut,
  isOwner,
  availablePricing,
}: BookingRequestFormProps) {
  const router = useRouter()
  const [pricingType, setPricingType] = useState<PricingType | ''>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const disabled = isSoldOut || isOwner || loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pricingType) {
      toast.error('Please select a pricing type.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, pricing_type: pricingType, message }),
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      toast.success('Booking request sent! The owner will be notified.')
      router.refresh()
    } catch {
      toast.error('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (isOwner) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        This is your listing.
      </p>
    )
  }

  if (isSoldOut) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        This space is currently sold out and not accepting new requests.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pricing_type">Pricing</Label>
        <Select
          value={pricingType}
          onValueChange={(v) => setPricingType(v as PricingType)}
          required
        >
          <SelectTrigger id="pricing_type">
            <SelectValue placeholder="Select a pricing option" />
          </SelectTrigger>
          <SelectContent>
            {availablePricing.map(({ type, price }) => (
              <SelectItem key={type} value={type}>
                {PRICING_LABELS[type]} — ${price.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea
          id="message"
          placeholder="Introduce yourself or ask any questions…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      <Button type="submit" className="w-full" disabled={disabled}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending request…
          </>
        ) : (
          'Request Booking'
        )}
      </Button>
    </form>
  )
}
