-- Safe public host profile for listing detail (id, full_name, avatar_url only).
-- Direct SELECT on public.users is restricted; embedding users in listing queries
-- failed for anonymous users and caused listing detail to 404.

CREATE OR REPLACE FUNCTION public.get_listing_owner_public(p_owner_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.full_name, u.avatar_url
  FROM public.users u
  WHERE u.id = p_owner_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.listings l
        WHERE l.owner_id = u.id
          AND l.is_active = true
      )
      OR u.id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_listing_owner_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_owner_public(uuid) TO anon, authenticated;
