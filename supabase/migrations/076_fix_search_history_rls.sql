-- Auto-populate user_id on search_history inserts from the authenticated session
-- The frontend insert omits user_id, causing RLS WITH CHECK (auth.uid() = user_id) to fail

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_search_history_user_id'
      AND tgrelid = 'search_history'::regclass
  ) THEN
    CREATE TRIGGER set_search_history_user_id
      BEFORE INSERT ON search_history
      FOR EACH ROW
      EXECUTE FUNCTION public.set_user_id();
  END IF;
END;
$$;
