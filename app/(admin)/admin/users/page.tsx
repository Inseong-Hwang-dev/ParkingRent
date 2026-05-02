import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserAdminActions } from '@/components/admin/user-admin-actions'

export const metadata = { title: 'Users' }

const PAGE_SIZE = 25

type UserWithListingCount = {
  id: string
  full_name: string
  email: string
  is_admin: boolean
  created_at: string
  listings: { count: number }[]
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
  return `/admin/users?${new URLSearchParams(merged).toString()}`
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  // Get current user id so we can mark "self"
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const db = createAdminClient()

  let query = db
    .from('users')
    .select('id, full_name, email, is_admin, created_at, listings(count)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, count } = (await query) as unknown as {
    data: UserWithListingCount[]
    count: number | null
  }

  const users = data ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const currentParams = q ? { q } : {}

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">{count ?? 0} total users</p>
      </div>

      {/* Search */}
      <form method="GET" action="/admin/users" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="h-9 w-72 rounded-md border bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
        />
        <button
          type="submit"
          className="h-9 rounded-md border bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/users"
            className="h-9 rounded-md border bg-background px-3 text-sm flex items-center text-muted-foreground hover:bg-accent transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const listingCount = u.listings?.[0]?.count ?? 0
                const isSelf = u.id === currentUser?.id
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{u.full_name || '—'}</p>
                        {isSelf && (
                          <Badge variant="secondary" className="text-[10px]">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {u.id.slice(0, 8)}…
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {listingCount}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell>
                      <UserAdminActions
                        userId={u.id}
                        isAdmin={u.is_admin}
                        isSelf={isSelf}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
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
