-- =============================================================================
-- ParkSpace – Initial Schema Migration
-- =============================================================================
-- Run in Supabase SQL Editor → or via: supabase db push
--
-- Order of operations:
--   1. Extensions
--   2. Tables
--   3. Indexes
--   4. Row Level Security
--   5. Auth trigger
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 users
-- Public profile table that mirrors auth.users, populated via trigger.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   text        NOT NULL,
  email       text        NOT NULL,
  phone       text        NULL,
  avatar_url  text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.2 listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid           NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  title               text           NOT NULL,
  description         text           NULL,
  address             text           NOT NULL,
  suburb              text           NOT NULL,
  state               text           NOT NULL,
  postcode            text           NOT NULL,
  lat                 float8         NOT NULL,
  lng                 float8         NOT NULL,
  space_type          text           NOT NULL
                        CHECK (space_type IN ('drive_away', 'lockup_garage', 'unsheltered', 'sheltered', 'indoor_lot')),
  price_daily         numeric(10, 2) NULL,
  price_fortnightly   numeric(10, 2) NULL,
  price_monthly       numeric(10, 2) NULL,
  access_instructions text           NULL,
  is_sold_out         boolean        NOT NULL DEFAULT false,
  is_active           boolean        NOT NULL DEFAULT true,
  is_featured         boolean        NOT NULL DEFAULT false,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT listings_has_price CHECK (
    price_daily IS NOT NULL OR
    price_fortnightly IS NOT NULL OR
    price_monthly IS NOT NULL
  )
);

-- ---------------------------------------------------------------------------
-- 2.3 listing_photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid        NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  url          text        NOT NULL,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.4 listing_vehicles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_vehicles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  vehicle    text NOT NULL
               CHECK (vehicle IN ('motorcycle', 'small_car', 'suv', 'van', 'small_truck', 'large_truck')),

  UNIQUE (listing_id, vehicle)
);

-- ---------------------------------------------------------------------------
-- 2.5 listing_features
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_features (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  feature    text NOT NULL
               CHECK (feature IN ('access_247', 'cctv', 'disabled_access', 'ev_charging', 'instant_booking', 'security')),

  UNIQUE (listing_id, feature)
);

-- ---------------------------------------------------------------------------
-- 2.6 booking_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid        NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id     uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  seller_id    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  pricing_type text        NOT NULL
                 CHECK (pricing_type IN ('daily', 'fortnightly', 'monthly')),
  message      text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate pending requests from the same buyer on the same listing
CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_no_duplicate_pending
  ON public.booking_requests (listing_id, buyer_id)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 2.7 notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type       text        NOT NULL
               CHECK (type IN ('booking_request', 'booking_accepted', 'booking_declined')),
  booking_id uuid        NULL REFERENCES public.booking_requests (id) ON DELETE SET NULL,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- 3. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS listings_owner_id_idx
  ON public.listings (owner_id);

CREATE INDEX IF NOT EXISTS listings_lat_lng_idx
  ON public.listings (lat, lng);

CREATE INDEX IF NOT EXISTS listings_active_sold_out_idx
  ON public.listings (is_active, is_sold_out);

CREATE INDEX IF NOT EXISTS booking_requests_listing_id_idx
  ON public.booking_requests (listing_id);

CREATE INDEX IF NOT EXISTS booking_requests_buyer_id_idx
  ON public.booking_requests (buyer_id);

CREATE INDEX IF NOT EXISTS booking_requests_seller_id_idx
  ON public.booking_requests (seller_id);


-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 4.1 users policies
-- ---------------------------------------------------------------------------

-- Anyone can read the safe public columns (id, full_name, avatar_url).
-- Phone and email are only visible to the row owner or parties in an accepted booking.
CREATE POLICY "users_select_public"
  ON public.users
  FOR SELECT
  USING (
    -- The user's own row
    id = auth.uid()
    OR
    -- Party in an accepted booking with this user
    EXISTS (
      SELECT 1
      FROM public.booking_requests br
      WHERE br.status = 'accepted'
        AND (br.buyer_id = auth.uid() OR br.seller_id = auth.uid())
        AND (br.buyer_id = users.id   OR br.seller_id = users.id)
    )
  );

-- Users can only update their own profile
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT is handled exclusively by the handle_new_user() trigger (service role)
-- No explicit INSERT policy — trigger runs with SECURITY DEFINER


-- ---------------------------------------------------------------------------
-- 4.2 listings policies
-- ---------------------------------------------------------------------------

-- Public read for active listings (no auth required)
CREATE POLICY "listings_select_active"
  ON public.listings
  FOR SELECT
  USING (is_active = true);

-- Owners can also read their own inactive listings
CREATE POLICY "listings_select_own"
  ON public.listings
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Any authenticated user can create a listing
CREATE POLICY "listings_insert_authenticated"
  ON public.listings
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only the owner can update their listing
CREATE POLICY "listings_update_owner"
  ON public.listings
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Only the owner can delete (soft-delete via is_active handled at app layer)
CREATE POLICY "listings_delete_owner"
  ON public.listings
  FOR DELETE
  USING (auth.uid() = owner_id);


-- ---------------------------------------------------------------------------
-- 4.3 listing_photos policies
-- ---------------------------------------------------------------------------

CREATE POLICY "listing_photos_select_public"
  ON public.listing_photos
  FOR SELECT
  USING (true);

CREATE POLICY "listing_photos_insert_owner"
  ON public.listing_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id FROM public.listings WHERE id = listing_id
    )
  );

CREATE POLICY "listing_photos_delete_owner"
  ON public.listing_photos
  FOR DELETE
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.listings WHERE id = listing_id
    )
  );


-- ---------------------------------------------------------------------------
-- 4.4 listing_vehicles policies
-- ---------------------------------------------------------------------------

CREATE POLICY "listing_vehicles_select_public"
  ON public.listing_vehicles
  FOR SELECT
  USING (true);

CREATE POLICY "listing_vehicles_insert_owner"
  ON public.listing_vehicles
  FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id FROM public.listings WHERE id = listing_id
    )
  );

CREATE POLICY "listing_vehicles_delete_owner"
  ON public.listing_vehicles
  FOR DELETE
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.listings WHERE id = listing_id
    )
  );


-- ---------------------------------------------------------------------------
-- 4.5 listing_features policies
-- ---------------------------------------------------------------------------

CREATE POLICY "listing_features_select_public"
  ON public.listing_features
  FOR SELECT
  USING (true);

CREATE POLICY "listing_features_insert_owner"
  ON public.listing_features
  FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id FROM public.listings WHERE id = listing_id
    )
  );

CREATE POLICY "listing_features_delete_owner"
  ON public.listing_features
  FOR DELETE
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.listings WHERE id = listing_id
    )
  );


-- ---------------------------------------------------------------------------
-- 4.6 booking_requests policies
-- ---------------------------------------------------------------------------

-- Buyer or seller can read their own booking requests
CREATE POLICY "booking_requests_select_party"
  ON public.booking_requests
  FOR SELECT
  USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

-- Authenticated users can create a booking request as the buyer
CREATE POLICY "booking_requests_insert_buyer"
  ON public.booking_requests
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = buyer_id
    AND buyer_id != seller_id  -- cannot book your own listing
  );

-- Status updates are restricted to valid transitions per role:
--   Seller: pending → accepted | declined
--   Buyer:  pending → cancelled
CREATE POLICY "booking_requests_update_seller_accept_decline"
  ON public.booking_requests
  FOR UPDATE
  USING (auth.uid() = seller_id AND status = 'pending')
  WITH CHECK (status IN ('accepted', 'declined'));

CREATE POLICY "booking_requests_update_buyer_cancel"
  ON public.booking_requests
  FOR UPDATE
  USING (auth.uid() = buyer_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');


-- ---------------------------------------------------------------------------
-- 4.7 notifications policies
-- ---------------------------------------------------------------------------

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT is service-role only (API routes / DB triggers use service role key)
-- No authenticated INSERT policy


-- =============================================================================
-- 5. AUTH TRIGGER — create public.users row on signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Drop and recreate to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
