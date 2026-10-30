-- Migration: Shared Links Notification Trigger
-- Purpose: Add notification trigger for shared_links table
-- Related: Notification triggers (055), Shared Links v2 (057)
--
-- This migration MUST run after 057_shared_links_v2.sql because it
-- creates a trigger on the shared_links table.

-- ============================================================================
-- TRIGGER: shared_link_created
-- ============================================================================

-- Trigger function for shared_links
CREATE OR REPLACE FUNCTION notify_shared_link_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_members JSONB;
  v_member UUID;
BEGIN
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
        'share_link_created',
        jsonb_build_object(
          'shareLinkId', NEW.id,
          'eventId', NEW.event_id,
          'createdBy', NEW.created_by,
          'actionUrl', '/shared/' || NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS shared_link_created_notification ON shared_links;
CREATE TRIGGER shared_link_created_notification
  AFTER INSERT ON shared_links
  FOR EACH ROW
  EXECUTE FUNCTION notify_shared_link_created();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION notify_shared_link_created() TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION notify_shared_link_created IS 'Trigger function that notifies event members when a shared link is created';
