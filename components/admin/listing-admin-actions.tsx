'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, Star, StarOff, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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

interface ListingAdminActionsProps {
  listingId: string
  isActive: boolean
  isFeatured: boolean
}

export function ListingAdminActions({
  listingId,
  isActive,
  isFeatured,
}: ListingAdminActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function patch(body: Record<string, boolean>, label: string) {
    setLoading(label)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete() {
    setLoading('delete')
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed')
      }
      toast.success('Listing deleted')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  const busy = loading !== null

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" asChild title="View listing">
        <Link href={`/listings/${listingId}`} target="_blank">
          <Eye className="h-3.5 w-3.5" />
        </Link>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        title={isActive ? 'Deactivate' : 'Activate'}
        onClick={() => patch({ is_active: !isActive }, 'active')}
      >
        {loading === 'active' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isActive ? (
          <ToggleRight className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        title={isFeatured ? 'Remove featured' : 'Mark featured'}
        onClick={() => patch({ is_featured: !isFeatured }, 'featured')}
      >
        {loading === 'featured' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isFeatured ? (
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        ) : (
          <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            title="Delete listing"
            className="text-destructive hover:text-destructive"
          >
            {loading === 'delete' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the listing and all its photos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
