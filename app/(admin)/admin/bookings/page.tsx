import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BookingStatus } from '@/types/database'

export const metadata = { title: 'Bookings' }

const PAGE_SIZE = 25

type AdminBooking = {
  id: string
  status: BookingStatus
  pricing_type: string
  created_at: string
  listing: { title: string } | null
  buyer: { full_name: string; email: string } | null
  seller: { full_name: string; email: string } | null
}

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
  { label: 'Cancelled', value: 'cancelled' },
]

const STATUS_BADGE: Record<BookingStatus, React.ComponentProps<typeof Badge>['variant']> = {
  pending: 'secondary',
  accepted: 'default',
  declined: 'destructive',
  cancelled: 'outline',
}

const PRICING_LABELS: Record<string, string> = {
  daily: 'Daily',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function buildUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string>
) {
  const merged: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v !== undefined) merged[k] = v
  }
  return `/admin/bookings?${new URLSearchParams(merged).toString()}`
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const params = await searchParams
  const status = params.status ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const db = createAdminClient()

  let query = db
    .from('booking_requests')
    .select(
      `id, status, pricing_type, created_at,
       listing:listings!booking_requests_listing_id_fkey(title),
       buyer:users!booking_requests_buyer_id_fkey(full_name, email),
       seller:users!booking_requests_seller_id_fkey(full_name, email)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (status !== 'all') {
    query = query.eq('status', status as BookingStatus)
  }

  const { data, count } = (await query) as unknown as {
    data: AdminBooking[]
    count: number | null
  }

  const bookings = data ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const currentParams = status !== 'all' ? { status } : {}

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">{count ?? 0} total bookings</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildUrl({ status: f.value }, { page: '1' })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="max-w-[200px]">
                    <p className="font-medium text-sm truncate">
                      {b.listing?.title ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {b.id.slice(0, 8)}…
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    <p className="text-sm truncate">{b.buyer?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.buyer?.email ?? ''}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    <p className="text-sm truncate">{b.seller?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.seller?.email ?? ''}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {PRICING_LABELS[b.pricing_type] ?? b.pricing_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[b.status]} className="capitalize text-xs">
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(b.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl(currentParams, { page: String(page - 1) })}
                className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl(currentParams, { page: String(page + 1) })}
                className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
