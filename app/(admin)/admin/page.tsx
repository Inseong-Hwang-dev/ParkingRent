import Link from 'next/link'
import { Users, List, BookOpen, CheckCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Dashboard' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function AdminDashboardPage() {
  const db = createAdminClient()

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: activeListings },
    { count: totalBookings },
    { data: recentUsers },
    { data: recentListings },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('listings').select('*', { count: 'exact', head: true }),
    db
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    db.from('booking_requests').select('*', { count: 'exact', head: true }),
    db
      .from('users')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('listings')
      .select('id, title, suburb, state, is_active, is_featured, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, icon: Users, href: '/admin/users' },
    { label: 'Total Listings', value: totalListings ?? 0, icon: List, href: '/admin/listings' },
    {
      label: 'Active Listings',
      value: activeListings ?? 0,
      icon: CheckCircle,
      href: '/admin/listings?status=active',
    },
    {
      label: 'Total Bookings',
      value: totalBookings ?? 0,
      icon: BookOpen,
      href: '/admin/bookings',
    },
  ]

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="block group">
            <Card className="transition-colors group-hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{value.toLocaleString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent signups */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Signups</h2>
            <Link
              href="/admin/users"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="rounded-lg border bg-card overflow-hidden">
            {!recentUsers || recentUsers.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">No users yet</p>
            ) : (
              <ul className="divide-y">
                {recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(u.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent listings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Listings</h2>
            <Link
              href="/admin/listings"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="rounded-lg border bg-card overflow-hidden">
            {!recentListings || recentListings.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">No listings yet</p>
            ) : (
              <ul className="divide-y">
                {recentListings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.suburb}, {l.state}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {l.is_featured && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          Featured
                        </Badge>
                      )}
                      {l.is_active ? (
                        <Badge variant="default" className="text-[10px] px-1.5">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
