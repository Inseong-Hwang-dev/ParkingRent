-- =============================================================================
-- ParkSpace – Admin flag on users
-- =============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- To grant admin access, run in Supabase SQL Editor:
-- UPDATE public.users SET is_admin = true WHERE id = '<your-user-uuid>';
