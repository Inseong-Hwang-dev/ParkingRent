import Link from 'next/link'
import { Metadata } from 'next'
import { Search, MessageSquare, Car, CheckCircle, ShieldCheck, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Learn how ParkSpace connects parking space owners with drivers in three simple steps.',
}

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          How ParkSpace Works
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Connecting drivers with parking space owners in three simple steps — no
          fees, no fuss.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-10">
        {STEPS.map(({ icon, step, title, description, detail }) => (
          <div key={step} className="flex gap-6">
            <div className="flex flex-col items-center shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {icon}
              </div>
              {step < STEPS.length && (
                <div className="mt-2 flex-1 w-px bg-border min-h-[2rem]" />
              )}
            </div>
            <div className="pb-10 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Step {step}
              </span>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* For owners section */}
      <div className="rounded-xl border bg-muted/30 p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold">For Space Owners</h2>
        <p className="text-muted-foreground">
          Have an unused driveway, garage, or car space? List it for free and
          start earning from renters in your area.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {OWNER_BULLETS.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <Button asChild className="mt-2">
          <Link href="/listings/new">List Your Space — It&apos;s Free</Link>
        </Button>
      </div>

      {/* Safety note */}
      <div className="rounded-xl border bg-muted/30 p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Safety &amp; Privacy</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Contact details (email and phone) are only revealed to both parties
          once a booking request is accepted. Until then, your personal
          information remains private.
        </p>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Ready to get started?</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link href="/listings">Find Parking</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Create an Account</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: <Search className="h-6 w-6" />,
    step: 1,
    title: 'Search for a Space',
    description:
      'Browse available parking spaces by suburb or postcode. Filter by space type, vehicle type, and features to find the right fit.',
    detail:
      'All listings are free to view. No account required to browse.',
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    step: 2,
    title: 'Send a Booking Request',
    description:
      'Found a space you like? Send a booking request to the owner. Choose your preferred pricing type (daily, weekly, or monthly) and include an optional message.',
    detail:
      'You\'ll need a free account to send a request. The owner will be notified immediately.',
  },
  {
    icon: <Car className="h-6 w-6" />,
    step: 3,
    title: 'Connect &amp; Park',
    description:
      'Once the owner accepts your request, both parties can see each other\'s contact details to arrange access.',
    detail:
      'No payment is processed through ParkSpace. Rental arrangements are made directly between you and the owner.',
  },
]

const OWNER_BULLETS = [
  'Create a listing in minutes — add photos, pricing, and access instructions',
  'You control who parks in your space by accepting or declining requests',
  'Mark your space as sold out when it\'s taken',
  'No fees — ParkSpace is completely free to use',
]
