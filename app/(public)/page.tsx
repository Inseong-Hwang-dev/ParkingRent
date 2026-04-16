import Link from 'next/link'
import { Search, MessageSquare, Car } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { ListingsSearchBar } from '@/components/listings/listings-search-bar'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('listings')
    .select('*, listing_photos(id, url, sort_order), listing_vehicles(vehicle)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const listings = (rows ?? []).map((l) => ({
    ...l,
    cover_photo:
      [...l.listing_photos]
        .sort(
          (a: { sort_order: number }, b: { sort_order: number }) =>
            a.sort_order - b.sort_order
        )[0] ?? null,
  }))

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24 px-4">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Find Your Perfect Parking Space
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Australia&apos;s free peer-to-peer parking marketplace. Find
            affordable parking or earn income from your unused space — no fees,
            no fuss.
          </p>

          <div className="max-w-md mx-auto">
            <ListingsSearchBar currentParams={{}} />
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/listings/new">List Your Space</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map(({ icon, step, title, description }) => (
              <div
                key={step}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-background border"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  {icon}
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Step {step}
                </span>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button variant="outline" asChild>
              <Link href="/how-it-works">Learn more about the process</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Recent listings ────────────────────────────────────────────────── */}
      {listings.length > 0 && (
        <section className="py-16 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Recently Listed</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/listings">View all →</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: <Search className="h-6 w-6" />,
    step: '1',
    title: 'Search',
    description:
      'Enter your suburb or postcode to browse available parking spaces near you.',
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    step: '2',
    title: 'Request',
    description:
      'Send a booking request to the owner with your preferred pricing type and a message.',
  },
  {
    icon: <Car className="h-6 w-6" />,
    step: '3',
    title: 'Park',
    description:
      'Once the owner accepts, contact details are revealed so you can arrange access.',
  },
]
