-- =============================================================================
-- ParkSpace – PostGIS geography column for listings
-- =============================================================================
-- Run in Supabase SQL Editor:
--   CREATE EXTENSION IF NOT EXISTS postgis;
-- (PostGIS is already enabled in 001_initial_schema.sql)
--
-- This migration:
--   1. Adds geog geography(Point,4326) column
--   2. Backfills from existing lat/lng
--   3. Adds GIST index for fast ST_DWithin / ST_Distance queries
--   4. Adds trigger to keep geog in sync on INSERT / UPDATE

-- 1. Add column (idempotent)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);

-- 2. Backfill existing rows
UPDATE public.listings
SET geog = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE geog IS NULL;

-- 3. GIST index
CREATE INDEX IF NOT EXISTS listings_geog_idx
  ON public.listings USING GIST (geog);

-- 4. Trigger function
CREATE OR REPLACE FUNCTION public.listings_set_geog()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.geog := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$;

-- 4a. Attach trigger (drop first to make idempotent)
DROP TRIGGER IF EXISTS listings_geog_update ON public.listings;

CREATE TRIGGER listings_geog_update
  BEFORE INSERT OR UPDATE OF lat, lng
  ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_set_geog();
