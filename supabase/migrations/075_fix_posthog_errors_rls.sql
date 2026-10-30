-- Fix RLS policies on posthog_errors and posthog_poll_log
-- Previous policies used auth.jwt()->>'role' which checks the JWT 'role' claim
-- (always 'authenticated'), not the user's actual role from profiles table.
-- Use the same pattern as audit_log (migration 059).

DROP POLICY IF EXISTS "Admins can read posthog_errors" ON posthog_errors;
DROP POLICY IF EXISTS "Admins can read posthog_poll_log" ON posthog_poll_log;

CREATE POLICY "Admins can read posthog_errors"
  ON posthog_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can read posthog_poll_log"
  ON posthog_poll_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
