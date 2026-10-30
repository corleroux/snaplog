-- Fix profiles RLS policy to allow authenticated users to view all profiles
-- This is needed for the member dropdown to show all available users

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "users can view their own profile" ON public.profiles;

-- Create new policy that allows all authenticated users to view all profiles
-- This is safe because profiles only contain non-sensitive user info (name, avatar, company)
CREATE POLICY "authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);
