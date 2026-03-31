-- =============================================================================
-- ParkSpace – Storage Bucket & Policies
-- =============================================================================
-- Run in Supabase SQL Editor → or via: supabase db push
--
-- Prerequisites: 001_initial_schema.sql must have been applied first.
--
-- Creates the listing-photos bucket and its access policies:
--   - Public SELECT (listings are publicly discoverable)
--   - Authenticated INSERT (any signed-in user can upload to their listing)
--   - Authenticated DELETE (only the listing owner can remove photos)
-- =============================================================================


-- =============================================================================
-- 1. BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,                             -- public read
  5242880,                          -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- =============================================================================
-- 2. STORAGE POLICIES
-- =============================================================================
-- Storage policies live in the storage.objects table.
-- Path convention: {listing_id}/{photo_id}.{ext}
-- The listing_id is the first path segment, extracted with split_part().

-- ---------------------------------------------------------------------------
-- 2.1 Public read — anyone can view listing photos
-- ---------------------------------------------------------------------------
CREATE POLICY "listing_photos_storage_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'listing-photos');


-- ---------------------------------------------------------------------------
-- 2.2 Authenticated upload — user must own the listing
--
-- Path structure: listing-photos/{listing_id}/{filename}
-- We extract listing_id from the storage object name and verify ownership.
-- ---------------------------------------------------------------------------
CREATE POLICY "listing_photos_storage_insert_owner"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (
      SELECT owner_id
      FROM public.listings
      WHERE id = (split_part(name, '/', 1))::uuid
    ) = auth.uid()
  );


-- ---------------------------------------------------------------------------
-- 2.3 Authenticated delete — user must own the listing
-- ---------------------------------------------------------------------------
CREATE POLICY "listing_photos_storage_delete_owner"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (
      SELECT owner_id
      FROM public.listings
      WHERE id = (split_part(name, '/', 1))::uuid
    ) = auth.uid()
  );
