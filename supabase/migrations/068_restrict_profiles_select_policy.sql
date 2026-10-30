-- P1-SEC-1: Restrict profiles SELECT policy to prevent mass email enumeration
--
-- Problem: migration 029 set a policy allowing ANY authenticated user to
-- SELECT * FROM profiles, exposing every registered user's email address.
--
-- Fix:
-- 1. Replace the permissive policy with a co-member scoped one: a user can
--    see their own profile and the profiles of people in the same event.
-- 2. Add a SECURITY DEFINER function for email-based user lookup so the
--    Add Member flow can still search by email without direct table access.

-- ─── 1. Replace SELECT policy ───────────────────────────────────────────────

DROP POLICY IF EXISTS "authenticated users can view profiles" ON public.profiles;

CREATE POLICY "users can view own and co-member profiles"
ON public.profiles FOR SELECT
USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Profile of someone who shares at least one event with the current user
  EXISTS (
    SELECT 1
    FROM public.event_members em_me
    JOIN public.event_members em_them
      ON em_me.event_id = em_them.event_id
    WHERE em_me.user_id  = auth.uid()
      AND em_them.user_id = profiles.id
  )
);

-- ─── 2. Email search function (SECURITY DEFINER) ────────────────────────────
-- Allows authenticated users to search profiles by email without being able
-- to enumerate the full table. Enforces a minimum query length and result cap
-- so it cannot be used as a bulk-export mechanism.

CREATE OR REPLACE FUNCTION public.search_profiles_by_email(
  query       text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id           uuid,
  full_name    text,
  email        text,
  avatar_url   text,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reject queries that are too short to be meaningful (and easy to abuse)
  IF length(trim(query)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.avatar_url,
      p.company_name
    FROM public.profiles p
    WHERE p.email ILIKE '%' || trim(query) || '%'
    ORDER BY p.email
    LIMIT LEAST(result_limit, 10);
END;
$$;

-- Allow any authenticated user to call the function
GRANT EXECUTE ON FUNCTION public.search_profiles_by_email(text, int) TO authenticated;
