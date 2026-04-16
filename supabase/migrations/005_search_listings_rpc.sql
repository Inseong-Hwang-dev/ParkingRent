-- =============================================================================
-- ParkSpace – search_listings RPC
-- =============================================================================
-- Handles all listing search/filter/sort in one query, including:
--   - Full-text search (title, suburb, address)
--   - Space type, vehicle type, features filters
--   - Price range (compared as daily equivalent)
--   - PostGIS distance filter (ST_DWithin) + distance sort (ST_Distance)
--   - Bounding box filter for map viewport
--   - Sort: distance | price_asc | price_desc | featured | newest
--   - Pagination with total_count embedded in result rows

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
  price_fortnightly   numeric,
  price_monthly       numeric,
  access_instructions text,
  is_sold_out         boolean,
  is_active           boolean,
  is_featured         boolean,
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
  -- Build origin point for geo queries when lat/lng provided
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
      -- Daily-equivalent price for comparison (cheapest available option)
      LEAST(
        COALESCE(l.price_daily,           999999::numeric),
        COALESCE(l.price_fortnightly / 14, 999999::numeric),
        COALESCE(l.price_monthly     / 30, 999999::numeric)
      ) AS daily_equiv
    FROM public.listings l
    WHERE
      l.is_active = true
      -- Text search
      AND (
        p_search = '' OR p_search IS NULL OR
        l.title   ILIKE '%' || p_search || '%' OR
        l.suburb  ILIKE '%' || p_search || '%' OR
        l.address ILIKE '%' || p_search || '%'
      )
      -- Space type filter
      AND (NOT v_has_spaces OR l.space_type = ANY(p_space_types))
      -- Vehicle type filter (listing must support at least one requested vehicle)
      AND (
        NOT v_has_vehicles OR
        EXISTS (
          SELECT 1 FROM public.listing_vehicles lv
          WHERE lv.listing_id = l.id AND lv.vehicle = ANY(p_vehicles)
        )
      )
      -- Features filter (listing must have ALL requested features)
      AND (
        NOT v_has_features OR
        (
          SELECT COUNT(*)
          FROM public.listing_features lf
          WHERE lf.listing_id = l.id AND lf.feature = ANY(p_features)
        ) = array_length(p_features, 1)
      )
      -- Price range (daily equivalent)
      AND (
        p_min_price IS NULL OR
        LEAST(
          COALESCE(l.price_daily,           999999::numeric),
          COALESCE(l.price_fortnightly / 14, 999999::numeric),
          COALESCE(l.price_monthly     / 30, 999999::numeric)
        ) >= p_min_price
      )
      AND (
        p_max_price IS NULL OR
        LEAST(
          COALESCE(l.price_daily,           999999::numeric),
          COALESCE(l.price_fortnightly / 14, 999999::numeric),
          COALESCE(l.price_monthly     / 30, 999999::numeric)
        ) <= p_max_price
      )
      -- Distance radius filter
      AND (NOT v_has_radius OR ST_DWithin(l.geog, v_origin, p_radius_metres))
      -- Bounding box filter for map viewport
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
    f.price_fortnightly,
    f.price_monthly,
    f.access_instructions,
    f.is_sold_out,
    f.is_active,
    f.is_featured,
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
    -- Distance sort (ascending, nulls last)
    CASE WHEN p_sort = 'distance' AND f.dist IS NOT NULL THEN f.dist END ASC NULLS LAST,
    -- Price ascending
    CASE WHEN p_sort = 'price_asc'  THEN f.daily_equiv END ASC  NULLS LAST,
    -- Price descending (negate so DESC picks the highest real price, nulls last via 0 coalesce in daily_equiv)
    CASE WHEN p_sort = 'price_desc' THEN f.daily_equiv END DESC NULLS LAST,
    -- Featured: featured listings first
    CASE WHEN p_sort = 'featured'   THEN f.is_featured::int END DESC NULLS LAST,
    -- Always fall back to newest
    f.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

-- Grant to all roles that access listings
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
