'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BookingStatus } from '@/types/database'

interface BookingActionsProps {
  bookingId: string
  listingId: string
  status: BookingStatus
  role: 'buyer' | 'seller'
  isSoldOut: boolean
}

export function BookingActions({
  bookingId,
  listingId,
  status,
  role,
  isSoldOut,
}: BookingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateBookingStatus(newStatus: BookingStatus) {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Something went wrong.')
        return
      }
      toast.success(
        newStatus === 'accepted'
          ? 'Booking accepted. The renter has been notified.'
          : newStatus === 'declined'
            ? 'Booking declined.'
            : 'Booking request cancelled.'
      )
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function markSoldOut() {
    setLoading('sold_out')
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_sold_out: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Something went wrong.')
        return
      }
      toast.success('Listing marked as sold out.')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  // Seller actions on pending booking
  if (role === 'seller' && status === 'pending') {
    return (
      <div className="flex gap-3">
        <Button
          onClick={() => updateBookingStatus('accepted')}
          disabled={isLoading}
          className="flex-1"
        >
          {loading === 'accepted' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept
        </Button>
        <Button
          variant="outline"
          onClick={() => updateBookingStatus('declined')}
          disabled={isLoading}
          className="flex-1"
        >
          {loading === 'declined' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Decline
        </Button>
      </div>
    )
  }

  // Buyer action on pending booking
  if (role === 'buyer' && status === 'pending') {
    return (
      <Button
        variant="outline"
        onClick={() => updateBookingStatus('cancelled')}
        disabled={isLoading}
        className="w-full"
      >
        {loading === 'cancelled' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Cancel Request
      </Button>
    )
  }

  // Seller mark as sold out on accepted booking
  if (role === 'seller' && status === 'accepted' && !isSoldOut) {
    return (
      <Button
        variant="outline"
        onClick={markSoldOut}
        disabled={isLoading}
        className="w-full"
      >
        {loading === 'sold_out' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Mark Listing as Sold Out
      </Button>
    )
  }

  return null
}
