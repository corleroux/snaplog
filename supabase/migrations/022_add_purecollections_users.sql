-- ============================================================================
-- Add purecollections.co.za users to event_members
-- ============================================================================
--
-- This migration adds test@purecollections.co.za and bruce@purecollections.co.za
-- to the first active event so they can access the application.
--
-- Note: This assumes the auth users exist in auth.users and corresponding
-- profiles exist in public.profiles. If profiles don't exist yet, they will
-- need to be created manually or via the user registration flow.
-- ============================================================================

DO $$
DECLARE
  -- Target event (first active event)
  target_event_id uuid;
  target_event_name text;

  -- User IDs (will be looked up from profiles)
  test_user_id uuid;
  bruce_user_id uuid;

  -- Count of existing memberships
  existing_count integer;
BEGIN
  -- Find the first active event
  SELECT id, name
  INTO target_event_id, target_event_name
  FROM public.events
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if we found an event
  IF target_event_id IS NULL THEN
    RAISE NOTICE 'No active event found. Skipping user addition.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found active event: % (%)', target_event_name, target_event_id;

  -- Find user IDs by email from profiles table
  -- Note: profiles.id should match auth.users.id
  SELECT id INTO test_user_id
  FROM public.profiles
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'test@purecollections.co.za'
  )
  LIMIT 1;

  SELECT id INTO bruce_user_id
  FROM public.profiles
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'bruce@purecollections.co.za'
  )
  LIMIT 1;

  -- Add test@purecollections.co.za as admin
  IF test_user_id IS NOT NULL THEN
    -- Check if already a member
    SELECT COUNT(*) INTO existing_count
    FROM public.event_members
    WHERE event_id = target_event_id AND user_id = test_user_id;

    IF existing_count = 0 THEN
      INSERT INTO public.event_members (event_id, user_id, role)
      VALUES (target_event_id, test_user_id, 'admin');
      RAISE NOTICE 'Added test@purecollections.co.za as admin to event %', target_event_name;
    ELSE
      RAISE NOTICE 'test@purecollections.co.za is already a member of event %', target_event_name;
    END IF;
  ELSE
    RAISE NOTICE 'User test@purecollections.co.za not found in profiles. Skipping.';
  END IF;

  -- Add bruce@purecollections.co.za as admin
  IF bruce_user_id IS NOT NULL THEN
    -- Check if already a member
    SELECT COUNT(*) INTO existing_count
    FROM public.event_members
    WHERE event_id = target_event_id AND user_id = bruce_user_id;

    IF existing_count = 0 THEN
      INSERT INTO public.event_members (event_id, user_id, role)
      VALUES (target_event_id, bruce_user_id, 'admin');
      RAISE NOTICE 'Added bruce@purecollections.co.za as admin to event %', target_event_name;
    ELSE
      RAISE NOTICE 'bruce@purecollections.co.za is already a member of event %', target_event_name;
    END IF;
  ELSE
    RAISE NOTICE 'User bruce@purecollections.co.za not found in profiles. Skipping.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User addition complete';
  RAISE NOTICE '========================================';
END $$;
