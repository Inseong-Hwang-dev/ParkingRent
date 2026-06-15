-- =============================================================================
-- ParkSpace – Rename "fortnightly" pricing to "weekly"
-- =============================================================================

-- 1. Rename column on listings (idempotent — may already be renamed) ──────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'price_fortnightly'
  ) THEN
    ALTER TABLE public.listings RENAME COLUMN price_fortnightly TO price_weekly;
  END IF;
END;
$$;

-- 2. Replace the "has at least one price" check constraint ─────────────────────
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_has_price;
ALTER TABLE public.listings ADD CONSTRAINT listings_has_price CHECK (
  price_daily IS NOT NULL OR
  price_weekly IS NOT NULL OR
  price_monthly IS NOT NULL
);

-- 3. Update booking_requests.pricing_type values + check constraint ────────────
UPDATE public.booking_requests SET pricing_type = 'weekly' WHERE pricing_type = 'fortnightly';

ALTER TABLE public.booking_requests DROP CONSTRAINT IF EXISTS booking_requests_pricing_type_check;
ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_pricing_type_check
  CHECK (pricing_type IN ('daily', 'weekly', 'monthly'));

-- 4. Update search_listings RPC to use price_weekly (daily-equivalent = /7) ────
CREATE OR REPLACE FUNCTION public.search_listings(
  p_search        text      DEFAULT '',
  p_space_types   text[]    DEFAULT NULL,
  p_vehicles      text[]    DEFAULT NULL,
  p_features      text[]    DEFAULT NULL,
  p_min_price     numeric   DEFAULT NULL,
  p_max_price     numeric   DEFAULT NULL,
  p_search_lat    float8    DEFAULT NULL,
  p_search_lng    float8    DEFAULT NULL,
  p_radius_metres float8    DEFAULT NULL,
  p_ne_lat        float8    DEFAULT NULL,
  p_ne_lng        float8    DEFAULT NULL,
  p_sw_lat        float8    DEFAULT NULL,
  p_sw_lng        float8    DEFAULT NULL,
  p_sort          text      DEFAULT 'newest',
  p_limit         int       DEFAULT 12,
  p_offset        int       DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  owner_id            uuid,
  title               text,
  description         text,
  address             text,
  suburb              text,
  state               text,
  postcode            text,
  lat                 float8,
  lng                 float8,
  space_type          text,
  price_daily         numeric,
  price_weekly        numeric,
  price_monthly       numeric,
  access_instructions text,
  is_sold_out         boolean,
  is_active           boolean,
  is_featured         boolean,
  slug                text,
  created_at          timestamptz,
  updated_at          timestamptz,
  distance_metres     float8,
  cover_photo         jsonb,
  listing_vehicles    jsonb,
  listing_features    jsonb,
  total_count         bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origin       geography;
  v_has_vehicles boolean := COALESCE(array_length(p_vehicles, 1), 0) > 0;
  v_has_features boolean := COALESCE(array_length(p_features, 1), 0) > 0;
  v_has_spaces   boolean := COALESCE(array_length(p_space_types, 1), 0) > 0;
  v_has_bounds   boolean := (p_ne_lat IS NOT NULL AND p_ne_lng IS NOT NULL
                              AND p_sw_lat IS NOT NULL AND p_sw_lng IS NOT NULL);
  v_has_radius   boolean;
BEGIN
  IF p_search_lat IS NOT NULL AND p_search_lng IS NOT NULL THEN
    v_origin := ST_SetSRID(ST_MakePoint(p_search_lng, p_search_lat), 4326)::geography;
  END IF;

  v_has_radius := v_origin IS NOT NULL AND p_radius_metres IS NOT NULL;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      l.*,
      CASE WHEN v_origin IS NOT NULL
        THEN ST_Distance(l.geog, v_origin)
        ELSE NULL
      END AS dist,
      LEAST(
        COALESCE(l.price_daily,        999999::numeric),
        COALESCE(l.price_weekly  / 7,  999999::numeric),
        COALESCE(l.price_monthly / 30, 999999::numeric)
      ) AS daily_equiv
    FROM public.listings l
    WHERE
      l.is_active = true
      AND (
        p_search = '' OR p_search IS NULL OR
        l.title   ILIKE '%' || p_search || '%' OR
        l.suburb  ILIKE '%' || p_search || '%' OR
        l.address ILIKE '%' || p_search || '%'
      )
      AND (NOT v_has_spaces OR l.space_type = ANY(p_space_types))
      AND (
        NOT v_has_vehicles OR
        EXISTS (
          SELECT 1 FROM public.listing_vehicles lv
          WHERE lv.listing_id = l.id AND lv.vehicle = ANY(p_vehicles)
        )
      )
      AND (
        NOT v_has_features OR
        (
          SELECT COUNT(*)
          FROM public.listing_features lf
          WHERE lf.listing_id = l.id AND lf.feature = ANY(p_features)
        ) = array_length(p_features, 1)
      )
      AND (
        p_min_price IS NULL OR
        LEAST(
          COALESCE(l.price_daily,        999999::numeric),
          COALESCE(l.price_weekly  / 7,  999999::numeric),
          COALESCE(l.price_monthly / 30, 999999::numeric)
        ) >= p_min_price
      )
      AND (
        p_max_price IS NULL OR
        LEAST(
          COALESCE(l.price_daily,        999999::numeric),
          COALESCE(l.price_weekly  / 7,  999999::numeric),
          COALESCE(l.price_monthly / 30, 999999::numeric)
        ) <= p_max_price
      )
      AND (NOT v_has_radius OR ST_DWithin(l.geog, v_origin, p_radius_metres))
      AND (
        NOT v_has_bounds OR
        (l.lat BETWEEN p_sw_lat AND p_ne_lat AND l.lng BETWEEN p_sw_lng AND p_ne_lng)
      )
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM filtered
  )
  SELECT
    f.id,
    f.owner_id,
    f.title,
    f.description,
    f.address,
    f.suburb,
    f.state,
    f.postcode,
    f.lat::float8,
    f.lng::float8,
    f.space_type,
    f.price_daily,
    f.price_weekly,
    f.price_monthly,
    f.access_instructions,
    f.is_sold_out,
    f.is_active,
    f.is_featured,
    f.slug,
    f.created_at,
    f.updated_at,
    f.dist::float8                           AS distance_metres,
    (
      SELECT jsonb_build_object('url', p.url, 'sort_order', p.sort_order)
      FROM public.listing_photos p
      WHERE p.listing_id = f.id
      ORDER BY p.sort_order ASC
      LIMIT 1
    )                                        AS cover_photo,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('vehicle', lv.vehicle)), '[]'::jsonb)
      FROM public.listing_vehicles lv
      WHERE lv.listing_id = f.id
    )                                        AS listing_vehicles,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('feature', lf.feature)), '[]'::jsonb)
      FROM public.listing_features lf
      WHERE lf.listing_id = f.id
    )                                        AS listing_features,
    c.cnt                                    AS total_count
  FROM filtered f, counted c
  ORDER BY
    CASE WHEN p_sort = 'distance' AND f.dist IS NOT NULL THEN f.dist END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_asc'  THEN f.daily_equiv END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN f.daily_equiv END DESC NULLS LAST,
    CASE WHEN p_sort = 'featured'   THEN f.is_featured::int END DESC NULLS LAST,
    f.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.search_listings(
  text, text[], text[], text[], numeric, numeric,
  float8, float8, float8, float8, float8, float8, float8,
  text, int, int
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_listings(
  text, text[], text[], text[], numeric, numeric,
  float8, float8, float8, float8, float8, float8, float8,
  text, int, int
) TO anon, authenticated;
