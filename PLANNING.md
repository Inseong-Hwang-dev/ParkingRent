# ParkSpace – Product Requirements Document

## 1. Executive Summary

ParkSpace is a free-to-use, peer-to-peer parking space rental marketplace targeting Australia, launching Melbourne-first and expanding nationwide. Owners ("sellers") list available parking spaces; drivers ("buyers") discover and request bookings. No payment processing is in scope — the platform facilitates connection and contact exchange upon booking acceptance.

**Core value proposition:**
- Zero fees for listing or booking
- Simple, map-first discovery
- Transparent booking flow without financial risk

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | SSR/SSG out of the box, App Router for granular server vs. client rendering, Vercel-native |
| Language | TypeScript | Type safety across frontend + Supabase types |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, rapid prototyping; shadcn/ui for accessible, composable primitives |
| Backend / Auth | Supabase | Managed PostgreSQL, built-in Auth (email + OAuth), Storage, real-time — no custom server needed |
| Maps | Google Maps Platform | Maps JS API (display), Places API (autocomplete/search), Geocoding API (address → lat/lng) |
| React Maps Lib | `@vis.gl/react-google-maps` | Official React wrapper, supports Advanced Markers, minimal footprint |
| Deployment | Vercel | Zero-config Next.js deploys, edge middleware, preview environments |

---

## 3. Database Schema

### 3.1 `users` (extends Supabase `auth.users`)

> Supabase Auth owns `auth.users`. A `public.users` profile table mirrors it via trigger.

```
public.users
├── id                uuid  PK  (references auth.users.id)
├── full_name         text  NOT NULL
├── email             text  NOT NULL  (synced from auth.users)
├── phone             text  NULL      (hidden until booking accepted)
├── avatar_url        text  NULL
├── created_at        timestamptz  DEFAULT now()
└── updated_at        timestamptz  DEFAULT now()
```

**RLS:**
- `SELECT`: any authenticated user can read `id`, `full_name`, `avatar_url`
- `SELECT` phone/email: only visible to parties in an accepted booking (enforced via RLS policy joining `booking_requests`)
- `UPDATE`: owner only (`auth.uid() = id`)

---

### 3.2 `listings`

```
public.listings
├── id                uuid  PK  DEFAULT gen_random_uuid()
├── owner_id          uuid  NOT NULL  REFERENCES public.users(id) ON DELETE CASCADE
├── title             text  NOT NULL
├── description       text  NULL
├── address           text  NOT NULL        (full formatted address)
├── suburb            text  NOT NULL
├── state             text  NOT NULL        (e.g. 'VIC')
├── postcode          text  NOT NULL
├── lat               float8  NOT NULL
├── lng               float8  NOT NULL
├── space_type        text  NOT NULL        (enum: see 3.2a)
├── price_daily       numeric(10,2)  NULL
├── price_fortnightly numeric(10,2)  NULL
├── price_monthly     numeric(10,2)  NULL
├── access_instructions text  NULL          (shown after booking accepted)
├── is_sold_out       boolean  DEFAULT false
├── is_active         boolean  DEFAULT true
├── is_featured       boolean  DEFAULT false
├── created_at        timestamptz  DEFAULT now()
└── updated_at        timestamptz  DEFAULT now()
```

**3.2a `space_type` enum values:**
`drive_away` | `lockup_garage` | `unsheltered` | `sheltered` | `indoor_lot`

**RLS:**
- `SELECT`: public (no auth required) for `is_active = true`
- `INSERT`: authenticated users only
- `UPDATE` / `DELETE`: `auth.uid() = owner_id`

---

### 3.3 `listing_photos`

```
public.listing_photos
├── id            uuid  PK  DEFAULT gen_random_uuid()
├── listing_id    uuid  NOT NULL  REFERENCES public.listings(id) ON DELETE CASCADE
├── storage_path  text  NOT NULL    (Supabase Storage path within listing-photos bucket)
├── url           text  NOT NULL    (public CDN URL)
├── sort_order    int   NOT NULL  DEFAULT 0
└── created_at    timestamptz  DEFAULT now()
```

**RLS:**
- `SELECT`: public
- `INSERT` / `DELETE`: `auth.uid() = (SELECT owner_id FROM listings WHERE id = listing_id)`

**Constraint:** max 10 photos per listing enforced at application layer (API route) and via DB check trigger.

---

### 3.4 `listing_vehicles`

```
public.listing_vehicles
├── id          uuid  PK  DEFAULT gen_random_uuid()
├── listing_id  uuid  NOT NULL  REFERENCES public.listings(id) ON DELETE CASCADE
└── vehicle     text  NOT NULL    (enum: see 3.4a)
```

**3.4a `vehicle` enum values:**
`motorcycle` | `small_car` | `suv` | `van` | `small_truck` | `large_truck`

**RLS:** mirrors `listing_photos`

---

### 3.5 `listing_features`

```
public.listing_features
├── id          uuid  PK  DEFAULT gen_random_uuid()
├── listing_id  uuid  NOT NULL  REFERENCES public.listings(id) ON DELETE CASCADE
└── feature     text  NOT NULL    (enum: see 3.5a)
```

**3.5a `feature` enum values:**
`access_247` | `cctv` | `disabled_access` | `ev_charging` | `instant_booking` | `security`

**RLS:** mirrors `listing_photos`

---

### 3.6 `booking_requests`

```
public.booking_requests
├── id             uuid  PK  DEFAULT gen_random_uuid()
├── listing_id     uuid  NOT NULL  REFERENCES public.listings(id) ON DELETE CASCADE
├── buyer_id       uuid  NOT NULL  REFERENCES public.users(id) ON DELETE CASCADE
├── seller_id      uuid  NOT NULL  REFERENCES public.users(id) ON DELETE CASCADE
├── status         text  NOT NULL  DEFAULT 'pending'   (enum: see 3.6a)
├── pricing_type   text  NOT NULL                      (daily | fortnightly | monthly)
├── message        text  NULL      (optional message from buyer)
├── created_at     timestamptz  DEFAULT now()
└── updated_at     timestamptz  DEFAULT now()
```

**3.6a `status` enum values:**
`pending` | `accepted` | `declined` | `cancelled`

**RLS:**
- `SELECT`: `auth.uid() = buyer_id OR auth.uid() = seller_id`
- `INSERT`: authenticated users, `auth.uid() = buyer_id`
- `UPDATE` status: seller may set `accepted` / `declined`; buyer may set `cancelled`
- Prevent duplicate pending requests: unique constraint on `(listing_id, buyer_id, status)` where status = `pending`

---

### 3.7 `notifications`

```
public.notifications
├── id           uuid  PK  DEFAULT gen_random_uuid()
├── user_id      uuid  NOT NULL  REFERENCES public.users(id) ON DELETE CASCADE
├── type         text  NOT NULL    (booking_request | booking_accepted | booking_declined)
├── booking_id   uuid  NULL  REFERENCES public.booking_requests(id) ON DELETE SET NULL
├── is_read      boolean  DEFAULT false
└── created_at   timestamptz  DEFAULT now()
```

**RLS:**
- `SELECT` / `UPDATE`: `auth.uid() = user_id`
- `INSERT`: server-side only (service role key via API route / DB trigger)

---

## 4. Page & Component Structure

### 4.1 Route Map

```
app/
├── (public)/
│   ├── page.tsx                        → / (Homepage: hero + search bar + featured listings)
│   ├── listings/
│   │   ├── page.tsx                    → /listings (Map + List dual view, filters)
│   │   └── [id]/
│   │       └── page.tsx                → /listings/[id] (Listing detail)
│   ├── about/
│   │   └── page.tsx                    → /about
│   └── how-it-works/
│       └── page.tsx                    → /how-it-works
│
├── (auth)/
│   ├── login/
│   │   └── page.tsx                    → /login
│   └── signup/
│       └── page.tsx                    → /signup
│
├── (dashboard)/
│   ├── layout.tsx                      → Protected layout (redirect if unauthenticated)
│   ├── dashboard/
│   │   └── page.tsx                    → /dashboard (overview: my listings + booking requests)
│   ├── listings/
│   │   ├── new/
│   │   │   └── page.tsx                → /listings/new (Create listing form)
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx            → /listings/[id]/edit
│   ├── bookings/
│   │   ├── page.tsx                    → /bookings (All booking requests: sent + received)
│   │   └── [id]/
│   │       └── page.tsx                → /bookings/[id] (Booking detail + contact info if accepted)
│   └── profile/
│       └── page.tsx                    → /profile (Edit name, phone, avatar)
│
└── api/
    ├── listings/
    │   ├── route.ts                    → GET (search/filter), POST (create)
    │   └── [id]/
    │       └── route.ts                → GET, PATCH, DELETE
    ├── listings/[id]/photos/
    │   └── route.ts                    → POST (upload), DELETE
    ├── bookings/
    │   └── route.ts                    → GET (list), POST (create request)
    ├── bookings/[id]/
    │   └── route.ts                    → GET, PATCH (accept/decline/cancel)
    └── notifications/
        └── route.ts                    → GET (list), PATCH (mark read)
```

### 4.2 Component Structure

```
components/
├── ui/                                 → shadcn/ui (auto-generated, do not edit manually)
├── layout/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── DashboardSidebar.tsx
├── listings/
│   ├── ListingCard.tsx                 → Card for list view
│   ├── ListingGrid.tsx                 → Grid wrapper
│   ├── ListingDetailHero.tsx           → Photo carousel + key info
│   ├── ListingForm.tsx                 → Create/Edit form (multi-step)
│   ├── PhotoUploader.tsx               → Drag-and-drop photo upload (max 10)
│   ├── SpaceTypeBadge.tsx
│   ├── VehicleTypeIcons.tsx
│   └── FeatureBadges.tsx
├── map/
│   ├── MapView.tsx                     → Google Maps canvas ("use client")
│   ├── ListingMarker.tsx               → Custom Advanced Marker per listing
│   ├── MapSearchBar.tsx                → Places Autocomplete input
│   └── ClusterLayer.tsx                → Marker clustering
├── search/
│   ├── SearchBar.tsx                   → Homepage + /listings page search
│   ├── FilterPanel.tsx                 → Sidebar / bottom-sheet filters
│   ├── FilterChips.tsx                 → Active filter pills
│   ├── PriceRangeSlider.tsx
│   ├── DistanceSlider.tsx
│   └── SortDropdown.tsx
├── bookings/
│   ├── BookingRequestButton.tsx        → CTA on listing detail
│   ├── BookingRequestForm.tsx          → Modal: pricing type select + message
│   ├── BookingCard.tsx                 → In /bookings list
│   └── ContactReveal.tsx               → Shows contact info after acceptance
├── auth/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── GoogleAuthButton.tsx
└── common/
    ├── LoadingSpinner.tsx
    ├── EmptyState.tsx
    ├── ErrorBoundary.tsx
    └── NotificationBell.tsx
```

---

## 5. API Routes

### 5.1 Listings

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/listings` | Optional | Search + filter listings. Query params: `lat`, `lng`, `radius`, `vehicle`, `space_type`, `feature`, `min_price`, `max_price`, `sort`, `limit`, `offset` |
| `POST` | `/api/listings` | Required | Create new listing (validates max photos client-side) |
| `GET` | `/api/listings/[id]` | Optional | Get single listing (includes photos, vehicles, features) |
| `PATCH` | `/api/listings/[id]` | Owner | Update listing fields |
| `DELETE` | `/api/listings/[id]` | Owner | Soft-delete (`is_active = false`) |
| `POST` | `/api/listings/[id]/photos` | Owner | Upload photo to Supabase Storage, insert `listing_photos` row |
| `DELETE` | `/api/listings/[id]/photos/[photoId]` | Owner | Delete from Storage + DB |

### 5.2 Bookings

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings` | Required | List bookings for current user (as buyer or seller). Query: `role=buyer\|seller`, `status` |
| `POST` | `/api/bookings` | Required | Create booking request |
| `GET` | `/api/bookings/[id]` | Party only | Get booking detail. Returns contact info if `status = accepted` |
| `PATCH` | `/api/bookings/[id]` | Party only | Update status (`accepted`, `declined`, `cancelled`) |

### 5.3 Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Required | List notifications for current user |
| `PATCH` | `/api/notifications/[id]` | Owner | Mark as read |

---

## 6. Google Maps Integration Plan

### 6.1 API Key & Library Loading

- Single API key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Load via `<APIProvider>` from `@vis.gl/react-google-maps` at app root (or layout)
- Libraries: `places`, `marker` (Advanced Markers)
- Restrict key by domain in Vercel production environment

```tsx
// app/layout.tsx (or providers wrapper)
import { APIProvider } from '@vis.gl/react-google-maps';

<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places', 'marker']}>
  {children}
</APIProvider>
```

### 6.2 Places Autocomplete (Listing Creation + Search)

- Use `usePlacesAutocomplete` hook or `Autocomplete` widget from `@vis.gl/react-google-maps`
- On selection: call Geocoding API to extract `lat`, `lng`, `suburb`, `state`, `postcode`
- Bias results to Australia: `componentRestrictions: { country: 'au' }`, `bounds` biased to Melbourne on initial load

### 6.3 Geocoding (Address → Coordinates)

- Triggered on listing create/edit when address changes
- Call via server-side API route (`/api/geocode`) using service key to avoid exposing in client
- Store `lat` / `lng` in `listings` table

### 6.4 Map Display (`/listings` page)

- `<Map>` component from `@vis.gl/react-google-maps`
- Initial centre: Melbourne CBD (`-37.8136, 144.9631`), zoom 12
- Re-centre on search result
- Custom `<AdvancedMarker>` per listing showing price pill
- Click marker → highlight corresponding list card + open info window with mini-card

### 6.5 Marker Clustering

- Use `@vis.gl/react-google-maps` `MarkerClusterer` or integrate `@googlemaps/markerclusterer`
- Cluster threshold: group markers within ~50px radius
- Cluster click → zoom in

### 6.6 Distance Filtering

- Calculate distance server-side using PostGIS `ST_DWithin` on `lat/lng` columns (add PostGIS extension in Supabase)
- Alternatively: use Haversine formula in PostgreSQL function exposed via RPC
- Distance slider: 1 km – 50 km

---

## 7. Supabase Setup

### 7.1 Auth Configuration

- Providers: Email/Password, Google OAuth
- Google OAuth: configure in Supabase Dashboard → Auth → Providers → Google
  - Requires Google Cloud OAuth 2.0 client credentials
  - Redirect URL: `https://<your-domain>/auth/callback`
- Email confirmations: enabled
- Create `public.users` row on signup via Supabase Auth trigger:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 7.2 Storage Bucket

- Bucket name: `listing-photos`
- Public read: YES (listings are publicly discoverable)
- Authenticated write: YES
- Path convention: `{listing_id}/{photo_id}.{ext}`
- Max file size: 5 MB per image (enforced in API route + Supabase bucket policy)
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### 7.3 Row Level Security Policies (Summary)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | Public (limited cols) | Via trigger only | Own row | — |
| `listings` | Public (active only) | Authenticated | Owner | Owner (soft-delete) |
| `listing_photos` | Public | Owner of listing | — | Owner of listing |
| `listing_vehicles` | Public | Owner of listing | — | Owner of listing |
| `listing_features` | Public | Owner of listing | — | Owner of listing |
| `booking_requests` | Buyer or Seller | Buyer | Buyer (cancel) / Seller (accept/decline) | — |
| `notifications` | Own rows | Service role | Own rows | — |

### 7.4 Supabase Client Files

```
lib/supabase/
├── client.ts       → createBrowserClient (for "use client" components)
├── server.ts       → createServerClient with cookie handling (for Server Components, Route Handlers)
└── middleware.ts   → refreshes session in Next.js middleware
```

Middleware (`middleware.ts` at project root) should run on all routes except static assets to keep session fresh.

---

## 8. Feature Implementation Notes

### 8.1 Booking Flow State Machine

```
[No Request]
     │
     ▼  buyer clicks "Request Booking"
[PENDING]
     │
     ├── seller clicks "Accept" ──► [ACCEPTED] → contact info revealed to both parties
     │                                            seller can mark listing "Sold Out"
     ├── seller clicks "Decline" ─► [DECLINED]
     │
     └── buyer clicks "Cancel" ──► [CANCELLED]
```

**Implementation:**
- Status transitions validated in `/api/bookings/[id]` PATCH handler
- Only seller can move `pending → accepted | declined`
- Only buyer can move `pending → cancelled`
- On `accepted`: trigger notification to buyer; insert `notification` row via service role
- UI: booking detail page polls or uses Supabase Realtime subscription for status changes

### 8.2 Contact Info Reveal

- `public.users.phone` and `email` are fetched only when a booking's status is `accepted` AND `auth.uid()` is `buyer_id` or `seller_id`
- RLS policy:

```sql
CREATE POLICY "contact_visible_on_accepted_booking"
ON public.users
FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.status = 'accepted'
    AND (br.buyer_id = auth.uid() OR br.seller_id = auth.uid())
    AND (br.buyer_id = users.id OR br.seller_id = users.id)
  )
);
```

### 8.3 Filter Logic

Filters are applied server-side in the `/api/listings` GET handler:

1. **Geospatial filter**: PostGIS `ST_DWithin(point(lng, lat), ST_MakePoint($lng, $lat)::geography, $radius_metres)`
2. **Vehicle type**: `EXISTS (SELECT 1 FROM listing_vehicles lv WHERE lv.listing_id = l.id AND lv.vehicle = ANY($vehicles))`
3. **Space type**: `l.space_type = ANY($space_types)`
4. **Features**: `(SELECT COUNT(*) FROM listing_features lf WHERE lf.listing_id = l.id AND lf.feature = ANY($features)) = array_length($features, 1)`
5. **Price range**: `COALESCE(l.price_daily, l.price_monthly) BETWEEN $min AND $max` (use whichever pricing type is set)
6. **Sort**:
   - `distance`: `ST_Distance(...) ASC`
   - `price_asc`: `LEAST(COALESCE(price_daily*30, price_monthly), price_monthly) ASC`
   - `price_desc`: DESC
   - `featured`: `is_featured DESC, created_at DESC`

### 8.4 Map ↔ List Synchronisation

- Shared state (React Context or Zustand store): `hoveredListingId`, `selectedListingId`
- Hovering a list card → highlights corresponding marker (CSS class or marker icon swap)
- Clicking a marker → scrolls list to card, opens mini info window on map
- Map viewport change (`onBoundsChanged`) → optional: re-fetch listings within new bounds (lazy load)

### 8.5 Photo Upload Flow

1. Client selects files (max 10, validated client-side)
2. POST to `/api/listings/[id]/photos` with `multipart/form-data`
3. API route: validate auth, validate file count, upload to Supabase Storage at `{listing_id}/{uuid}.{ext}`
4. Insert row in `listing_photos` with `storage_path` and public `url`
5. Return updated photo list
6. Client re-renders `PhotoUploader` with new photo thumbnails

### 8.6 "Sold Out" Flow

- Seller visits their listing detail or dashboard
- Clicks "Mark as Sold Out" button
- PATCH `/api/listings/[id]` with `{ is_sold_out: true }`
- Listing card shows "Sold Out" badge; "Request Booking" CTA is disabled

---

## 9. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Server-side only — never expose to client

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# App
NEXT_PUBLIC_APP_URL=https://parkspace.com.au   # Used for OAuth redirect URLs
```

**Vercel setup:**
- Add all vars in Vercel Dashboard → Settings → Environment Variables
- `SUPABASE_SERVICE_ROLE_KEY` must be set as non-public (no `NEXT_PUBLIC_` prefix)

---

## 10. Implementation Phases

### Phase 1 – MVP (Core Loop)

**Goal:** A user can list a space and another user can find and request it.

**Scope:**
- [ ] Next.js project scaffold with Tailwind + shadcn/ui
- [ ] Supabase project: schema, RLS, Auth (email only), Storage bucket
- [ ] Auth: email signup/login, session middleware
- [ ] User profile page (name, phone)
- [ ] Create listing form: address (Places Autocomplete), space type, vehicle types, pricing, photo upload (max 10)
- [ ] `/listings` page: list view (cards) + basic text search
- [ ] Listing detail page
- [ ] Booking request flow: request → accept/decline
- [ ] Contact info reveal on accepted booking
- [ ] Basic notifications (in-app bell, unread count)
- [ ] Mark listing as Sold Out
- [ ] Responsive layout (mobile-first)

**Not in Phase 1:**
- Map view
- Advanced filters
- Google OAuth
- Marker clustering
- Featured listings sort

---

### Phase 2 – Map & Discovery Polish

**Goal:** Full map-first discovery experience.

**Scope:**
- [ ] Google Maps integration: map view on `/listings`, custom markers with price pills
- [ ] Marker clustering
- [ ] Map ↔ list sync (hover, click)
- [ ] Full filter panel: vehicle type icons, space type, features, price slider, distance slider
- [ ] Sort: distance, price asc/desc, featured
- [ ] PostGIS distance filtering
- [ ] Google OAuth (Sign in with Google)
- [ ] Homepage hero with map preview or featured listings carousel
- [ ] Listing edit page
- [ ] Email notifications (Supabase Edge Functions or Resend)
- [ ] SEO: `generateMetadata` per listing page, sitemap

---

### Phase 3 – Growth & Nationwide

**Goal:** Scale beyond Melbourne, improve trust and retention.

**Scope:**
- [ ] Multi-city support (remove Melbourne bias from default search)
- [ ] "Featured" listing promotion (manual admin flag)
- [ ] Seller dashboard analytics (views, request count)
- [ ] Review/rating system (post-booking)
- [ ] Saved/favourited listings
- [ ] Progressive Web App (PWA) manifest + offline shell
- [ ] Admin dashboard (moderate listings, manage users)
- [ ] Legal: Terms of Service, Privacy Policy pages
- [ ] Accessibility audit (WCAG 2.1 AA)
