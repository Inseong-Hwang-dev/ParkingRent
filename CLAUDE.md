# ParkSpace – Claude Code Guidelines

## Project
Peer-to-peer parking space rental marketplace. Australia-focused (Melbourne first, then nationwide). No payment processing.

## Tech Stack
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Maps**: Google Maps Platform (Maps JS API, Places API, Geocoding API)
- **Deployment**: Vercel

## Key Conventions
- All user-facing copy in English (Australian English spelling: e.g. "colour", "authorise")
- Use App Router conventions: server components by default, `"use client"` only when needed
- Supabase client: use server-side client in Server Components/Route Handlers, browser client in Client Components
- Env vars: never hardcode — always use `process.env.NEXT_PUBLIC_*` or `process.env.*`
- Images: always use `next/image`
- Fetch data server-side where possible (reduce client bundle)

## Folder Structure
- `app/` — App Router pages and layouts
- `components/` — Reusable UI components
- `components/ui/` — shadcn/ui components (do not manually edit)
- `lib/` — Supabase clients, utility functions
- `lib/supabase/` — `client.ts` (browser), `server.ts` (server), `middleware.ts`
- `types/` — TypeScript types and interfaces
- `public/` — Static assets

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Supabase Notes
- Always use Row Level Security (RLS)
- Auth: email/password + Google OAuth (Supabase Auth)
- Storage bucket: `listing-photos` (public read, authenticated write)

## Google Maps Notes
- Restrict API key by domain in production
- Libraries to load: `places`, `marker`
- Use `@vis.gl/react-google-maps` package for React integration

## Do Not
- Do not use React class components
- Do not use `pages/` router
- Do not install duplicate packages for the same purpose
- Do not write raw SQL — use Supabase client methods or RPC
