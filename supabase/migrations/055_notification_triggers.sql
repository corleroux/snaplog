-- Migration: Notification Triggers
-- Purpose: Database triggers to automatically send notifications on key events
-- Related: In-app notification center (1.11), Email notification service (1.12)
--
-- This migration creates triggers that call the send-notification edge function
-- when important events occur in the system.

-- ============================================================================
-- FUNCTION: trigger_notification
-- ============================================================================
-- Calls the send-notification edge function for specified user and type
-- This function is invoked by database triggers

CREATE OR REPLACE FUNCTION trigger_notification(
  p_user_id UUID,
  p_type TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the notification trigger
  PERFORM pg_notify('notification', json_build_object(
    'user_id', p_user_id,
    'type', p_type,
    'data', p_data,
    'triggered_at', NOW()
  )::text);

  -- Note: The actual email sending is handled by the edge function
  -- which can be invoked via Supabase webhooks or separately
  -- This function primarily serves as a central point for triggering notifications
  -- and can be extended to call external services if needed

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    PERFORM pg_notify('notification_error', json_build_object(
      'user_id', p_user_id,
      'type', p_type,
      'error', SQLERRM,
      'triggered_at', NOW()
    )::text);
END;
$$;

-- NOTE: shared_links trigger moved to migration 058 to run AFTER shared_links table is created
-- The shared_links table is created in migration 057 (shared_links_v2.sql)
-- See 058_shared_links_triggers.sql for the trigger definition

-- ============================================================================
-- TRIGGER: vendor_added
-- ============================================================================

-- Trigger function for vendors
CREATE OR REPLACE FUNCTION notify_vendor_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_members JSONB;
  v_member UUID;
  v_event_name TEXT;
BEGIN
  -- Get event name
  SELECT name INTO v_event_name
  FROM events
  WHERE id = NEW.event_id;

  -- Get all event members (excluding the creator)
  SELECT jsonb_agg(user_id)
    INTO v_event_members
  FROM event_members
  WHERE event_id = NEW.event_id
    AND user_id != NEW.created_by
    AND role IN ('owner', 'admin', 'member');

  -- Send notification to each member
  IF v_event_members IS NOT NULL THEN
    FOR v_member IN SELECT * FROM jsonb_array_elements_text(v_event_members)
    LOOP
      PERFORM trigger_notification(
        v_member::UUID,
        'vendor_added',
        jsonb_build_object(
          'vendorId', NEW.id,
          'eventName', v_event_name,
          'vendorName', NEW.company_name,
          'actionUrl', '/events/' || NEW.event_id || '/vendors/' || NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS vendor_added_notification ON vendors;
CREATE TRIGGER vendor_added_notification
  AFTER INSERT ON vendors
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION notify_vendor_added();

-- ============================================================================
-- TRIGGER: fabric_style_added
-- ============================================================================

-- Trigger function for fabric_styles
CREATE OR REPLACE FUNCTION notify_fabric_style_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_members JSONB;
  v_member UUID;
  v_event_name TEXT;
  v_vendor_name TEXT;
BEGIN
  -- Get event and vendor names
  SELECT e.name, v.company_name
    INTO v_event_name, v_vendor_name
  FROM events e
    JOIN vendors v ON v.event_id = e.id
    WHERE e.id = NEW.event_id AND v.id = NEW.vendor_id;

  -- Get all event members (excluding the creator)
  SELECT jsonb_agg(user_id)
    INTO v_event_members
  FROM event_members
  WHERE event_id = NEW.event_id
    AND user_id != NEW.created_by
    AND role IN ('owner', 'admin', 'member');

  -- Send notification to each member
  IF v_event_members IS NOT NULL THEN
    FOR v_member IN SELECT * FROM jsonb_array_elements_text(v_event_members)
    LOOP
      PERFORM trigger_notification(
        v_member::UUID,
        'style_added',
        jsonb_build_object(
          'styleId', NEW.id,
          'eventName', v_event_name,
          'vendorName', v_vendor_name,
          'actionUrl', '/events/' || NEW.event_id || '/vendors/' || NEW.vendor_id || '/styles/' || NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS fabric_style_added_notification ON fabric_styles;
CREATE TRIGGER fabric_style_added_notification
  AFTER INSERT ON fabric_styles
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION notify_fabric_style_added();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute on trigger functions to service role
GRANT EXECUTE ON FUNCTION trigger_notification(UUID, TEXT, JSONB) TO service_role;
-- Note: notify_shared_link_created grant moved to migration 058
GRANT EXECUTE ON FUNCTION notify_vendor_added() TO service_role;
GRANT EXECUTE ON FUNCTION notify_fabric_style_added() TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION trigger_notification IS 'Triggers a notification for a user via the send-notification edge function';

-- Note: notify_shared_link_created comment moved to migration 058
COMMENT ON FUNCTION notify_vendor_added IS 'Trigger function that notifies event members when a vendor is added';

COMMENT ON FUNCTION notify_fabric_style_added IS 'Trigger function that notifies event members when a fabric style is added';
