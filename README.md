<img width="1417" height="747" alt="Screenshot 2026-06-01 at 3 49 31 pm" src="https://github.com/user-attachments/assets/233d58e8-d647-46b6-928b-18b3103e9496" />
# ParkSpace 🅿️

> Peer-to-peer parking space rental — Melbourne-first, free to use.

---

ParkSpace is a peer-to-peer parking space rental platform built for Australia — starting in Melbourne, with plans to expand nationwide. Think of it as a free alternative to ParkHound, where drivers can find available parking and space owners can list their spots without any platform fees.

---

## What it does

- **Find parking** — Browse available spaces on an interactive map or list view, filtered by vehicle type, space type, and distance
- **List your space** — Space owners can create listings in minutes using Google Places Autocomplete
- **Request & manage bookings** — Renters send booking requests; contact details are only revealed once the owner accepts
- **Real-time notifications** — In-app notification bell keeps both parties updated on booking status changes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (PostgreSQL + PostGIS, Auth, Storage, Realtime) |
| Maps | Google Maps Platform (Maps JS API, Places API, Geocoding API) |
| Deployment | Vercel |

---

## Key Features

- 🗺️ **Dual map/list view** with custom markers and map-list sync
- 🔍 **Filter panel** — vehicle type, space type, PostGIS-powered distance filtering
- 🔐 **Auth** — Email/password and Google OAuth via Supabase
- 📬 **Booking flow** — Request → Accept/Decline, with contact info gated behind acceptance
- 📍 **Melbourne-first**, built to scale nationally

---

## Project Status

- ✅ **Phase 1 complete** — Scaffolding, auth, listings, booking management, homepage
- 🚧 **Phase 2 in progress** — Maps integration, filter panel, listing edit, email notifications (Resend), SEO polish
- 🔮 **Phase 3 planned** — Slug-based URLs, nationwide expansion

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# → Add your Supabase, Google Maps, and Resend keys

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
RESEND_API_KEY=          # Required for email notifications (set up after domain verification)
```

> **Note:** Email notifications via Resend require a verified domain. When deploying, verify your domain (e.g. `parkspace.com.au`) in the Resend dashboard and set the `from` address to `noreply@parkspace.com.au`.
