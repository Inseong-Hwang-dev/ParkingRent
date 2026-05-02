import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PublicUserMenu } from '@/components/layout/PublicUserMenu'
import { GoogleMapsProvider } from '@/components/providers/google-maps-provider'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // Fetch public profile for avatar / display name when signed in
  const profile = authUser
    ? await supabase
        .from('users')
        .select('full_name, avatar_url, email')
        .eq('id', authUser.id)
        .single()
        .then(({ data }) => data)
    : null

  const userForMenu = authUser
    ? {
        full_name:
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          '',
        email: profile?.email || authUser.email || '',
        avatar_url:
          profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
      }
    : null

  return (
    <GoogleMapsProvider>
    <div className="flex min-h-screen flex-col">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-primary-foreground"
                aria-hidden="true"
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="font-bold tracking-tight">ParkSpace</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/listings">Find Parking</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/listings/new">List Your Space</Link>
            </Button>
          </nav>

          {/* Auth state */}
          <div className="ml-auto flex items-center gap-2">
            {userForMenu ? (
              <PublicUserMenu user={userForMenu} />
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} ParkSpace. Australia&apos;s free
            parking marketplace.
          </p>
          <nav className="flex items-center gap-4">
            <Link href="/how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/listings" className="hover:text-foreground transition-colors">
              Find Parking
            </Link>
          </nav>
        </div>
      </footer>
    </div>
    </GoogleMapsProvider>
  )
}
