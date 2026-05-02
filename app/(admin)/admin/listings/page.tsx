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
import { ListingAdminActions } from '@/components/admin/listing-admin-actions'

export const metadata = { title: 'Listings' }

const PAGE_SIZE = 25

type AdminListing = {
  id: string
  title: string
  suburb: string
  state: string
  is_active: boolean
  is_featured: boolean
  is_sold_out: boolean
  created_at: string
  owner: { id: string; full_name: string; email: string } | null
}

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Featured', value: 'featured' },
  { label: 'Sold Out', value: 'sold_out' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function buildUrl(base: Record<string, string>, overrides: Record<string, string>) {
  const p = new URLSearchParams({ ...base, ...overrides })
  return `/admin/listings?${p.toString()}`
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const status = params.status ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const db = createAdminClient()

  let query = db
    .from('listings')
    .select(
      'id, title, suburb, state, is_active, is_featured, is_sold_out, created_at, owner:users!listings_owner_id_fkey(id, full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q) query = query.ilike('title', `%${q}%`)
  if (status === 'active') query = query.eq('is_active', true)
  else if (status === 'inactive') query = query.eq('is_active', false)
  else if (status === 'featured') query = query.eq('is_featured', true)
  else if (status === 'sold_out') query = query.eq('is_sold_out', true)

  const { data, count } = (await query) as unknown as {
    data: AdminListing[]
    count: number | null
  }

  const listings = data ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const currentParams = { ...(q ? { q } : {}), ...(status !== 'all' ? { status } : {}) }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Listings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {count ?? 0} total listings
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form method="GET" action="/admin/listings" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by title…"
            className="h-9 w-64 rounded-md border bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          />
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="h-9 rounded-md border bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
          {q && (
            <Link
              href={buildUrl({ ...(status !== 'all' ? { status } : {}) }, {})}
              className="h-9 rounded-md border bg-background px-3 text-sm flex items-center text-muted-foreground hover:bg-accent transition-colors"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1 sm:ml-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildUrl({ ...(q ? { q } : {}), status: f.value }, { page: '1' })}
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
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No listings found
                </TableCell>
              </TableRow>
            ) : (
              listings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="max-w-[220px]">
                    <p className="font-medium truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {listing.id.slice(0, 8)}…
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    {listing.owner ? (
                      <>
                        <p className="truncate text-sm">{listing.owner.full_name || '—'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {listing.owner.email}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {listing.suburb}, {listing.state}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {listing.is_active ? (
                        <Badge variant="default" className="text-[10px]">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                      )}
                      {listing.is_featured && (
                        <Badge variant="secondary" className="text-[10px]">Featured</Badge>
                      )}
                      {listing.is_sold_out && (
                        <Badge variant="destructive" className="text-[10px]">Sold Out</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(listing.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ListingAdminActions
                      listingId={listing.id}
                      isActive={listing.is_active}
                      isFeatured={listing.is_featured}
                    />
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
