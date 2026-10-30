-- Approval Workflows Migration
-- Supports approval requests for entities with approval/reject workflow

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'style', 'variant')),
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  response_note TEXT,
  expires_at TIMESTAMPTZ
);

-- Create index for looking up approval requests by entity
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON public.approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view approval requests for entities they have access to
CREATE POLICY "Users can view approval requests on accessible entities"
  ON public.approval_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.user_id = auth.uid()
      AND (
        -- Direct event approval
        (approval_requests.entity_type = 'event' AND approval_requests.entity_id = event_members.event_id)
        -- Vendor belongs to event
        OR (approval_requests.entity_type = 'vendor' AND EXISTS (
          SELECT 1 FROM public.vendors
          WHERE vendors.id = approval_requests.entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Style belongs to vendor which belongs to event
        OR (approval_requests.entity_type = 'style' AND EXISTS (
          SELECT 1 FROM public.fabric_styles
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_styles.id = approval_requests.entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Variant belongs to style which belongs to vendor which belongs to event
        OR (approval_requests.entity_type = 'variant' AND EXISTS (
          SELECT 1 FROM public.fabric_variants
          INNER JOIN public.fabric_styles ON fabric_styles.id = fabric_variants.style_id
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_variants.id = approval_requests.entity_id
          AND vendors.event_id = event_members.event_id
        ))
      )
    )
    -- User created the request
    OR approval_requests.requested_by = auth.uid()
    -- User responded to the request
    OR approval_requests.responded_by = auth.uid()
  );

-- Users can create approval requests for entities they have access to
CREATE POLICY "Users can create approval requests on accessible entities"
  ON public.approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.user_id = auth.uid()
      AND (
        -- Direct event approval
        (entity_type = 'event' AND entity_id = event_members.event_id)
        -- Vendor belongs to event
        OR (entity_type = 'vendor' AND EXISTS (
          SELECT 1 FROM public.vendors
          WHERE vendors.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Style belongs to vendor which belongs to event
        OR (entity_type = 'style' AND EXISTS (
          SELECT 1 FROM public.fabric_styles
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_styles.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Variant belongs to style which belongs to vendor which belongs to event
        OR (entity_type = 'variant' AND EXISTS (
          SELECT 1 FROM public.fabric_variants
          INNER JOIN public.fabric_styles ON fabric_styles.id = fabric_variants.style_id
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_variants.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
      )
    )
    AND requested_by = auth.uid()
  );

-- Users can respond to approval requests for entities they have access to
CREATE POLICY "Users can respond to approval requests on accessible entities"
  ON public.approval_requests
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.user_id = auth.uid()
      AND (
        -- Direct event approval
        (entity_type = 'event' AND entity_id = event_members.event_id)
        -- Vendor belongs to event
        OR (entity_type = 'vendor' AND EXISTS (
          SELECT 1 FROM public.vendors
          WHERE vendors.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Style belongs to vendor which belongs to event
        OR (entity_type = 'style' AND EXISTS (
          SELECT 1 FROM public.fabric_styles
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_styles.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Variant belongs to style which belongs to vendor which belongs to event
        OR (entity_type = 'variant' AND EXISTS (
          SELECT 1 FROM public.fabric_variants
          INNER JOIN public.fabric_styles ON fabric_styles.id = fabric_variants.style_id
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_variants.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
      )
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND responded_by = auth.uid()
    AND responded_at = NOW()
  );

-- Function to request approval for an entity
CREATE OR REPLACE FUNCTION public.request_approval(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_expires_in INTERVAL DEFAULT INTERVAL '7 days'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_request_id UUID;
  v_event_id UUID;
BEGIN
  -- Verify user has access to the entity
  -- Get the event_id for the entity
  IF p_entity_type = 'vendor' THEN
    SELECT event_id INTO v_event_id FROM public.vendors WHERE id = p_entity_id;
  ELSIF p_entity_type = 'style' THEN
    SELECT v.event_id INTO v_event_id
    FROM public.fabric_styles s
    INNER JOIN public.vendors v ON v.id = s.vendor_id
    WHERE s.id = p_entity_id;
  ELSIF p_entity_type = 'variant' THEN
    SELECT v.event_id INTO v_event_id
    FROM public.fabric_variants var
    INNER JOIN public.fabric_styles s ON s.id = var.style_id
    INNER JOIN public.vendors v ON v.id = s.vendor_id
    WHERE var.id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity type';
  END IF;

  -- Check if user is a member of the event
  IF NOT EXISTS (
    SELECT 1 FROM public.event_members
    WHERE user_id = auth.uid()
    AND event_id = v_event_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to this entity';
  END IF;

  -- Check if there's already a pending approval request
  IF EXISTS (
    SELECT 1 FROM public.approval_requests
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'An approval request is already pending for this entity';
  END IF;

  -- Create the approval request
  INSERT INTO public.approval_requests (
    entity_type,
    entity_id,
    requested_by,
    expires_at
  ) VALUES (
    p_entity_type,
    p_entity_id,
    auth.uid(),
    NOW() + p_expires_in
  ) RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Function to respond to an approval request
CREATE OR REPLACE FUNCTION public.respond_to_approval(
  p_request_id UUID,
  p_status TEXT, -- 'approved' or 'rejected'
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  -- Update the approval request
  UPDATE public.approval_requests
  SET
    status = p_status,
    responded_by = auth.uid(),
    responded_at = NOW(),
    response_note = p_note
  WHERE id = p_request_id
  AND status = 'pending'
  AND EXISTS (
    -- Verify user has access to respond
    SELECT 1 FROM public.approval_requests ar
    INNER JOIN public.event_members em ON (
      em.user_id = auth.uid()
      AND (
        (ar.entity_type = 'event' AND ar.entity_id = em.event_id)
        OR (ar.entity_type = 'vendor' AND EXISTS (
          SELECT 1 FROM public.vendors WHERE id = ar.entity_id AND event_id = em.event_id
        ))
        OR (ar.entity_type = 'style' AND EXISTS (
          SELECT 1 FROM public.fabric_styles s
          INNER JOIN public.vendors v ON v.id = s.vendor_id
          WHERE s.id = ar.entity_id AND v.event_id = em.event_id
        ))
        OR (ar.entity_type = 'variant' AND EXISTS (
          SELECT 1 FROM public.fabric_variants var
          INNER JOIN public.fabric_styles s ON s.id = var.style_id
          INNER JOIN public.vendors v ON v.id = s.vendor_id
          WHERE var.id = ar.entity_id AND v.event_id = em.event_id
        ))
      )
    )
    WHERE ar.id = p_request_id
  );

  RETURN FOUND;
END;
$$;

-- Function to get approval status for an entity
CREATE OR REPLACE FUNCTION public.get_approval_status(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  requested_by UUID,
  requested_by_email TEXT,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ,
  status TEXT,
  responded_by UUID,
  responded_by_email TEXT,
  responded_by_name TEXT,
  responded_at TIMESTAMPTZ,
  response_note TEXT,
  expires_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.entity_type,
    ar.entity_id,
    ar.requested_by,
    requester.email AS requested_by_email,
    requester.raw_user_meta_data->>'full_name' AS requested_by_name,
    ar.requested_at,
    ar.status,
    ar.responded_by,
    responder.email AS responded_by_email,
    responder.raw_user_meta_data->>'full_name' AS responded_by_name,
    ar.responded_at,
    ar.response_note,
    ar.expires_at
  FROM public.approval_requests ar
  LEFT JOIN auth.users requester ON requester.id = ar.requested_by
  LEFT JOIN auth.users responder ON responder.id = ar.responded_by
  WHERE ar.entity_type = p_entity_type
    AND ar.entity_id = p_entity_id
  ORDER BY ar.requested_at DESC;
END;
$$;

-- Function to get pending approval requests for an event
CREATE OR REPLACE FUNCTION public.get_pending_approvals(
  p_event_id UUID
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  requested_by UUID,
  requested_by_email TEXT,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.entity_type,
    ar.entity_id,
    -- Get entity name
    CASE
      WHEN ar.entity_type = 'vendor' THEN (SELECT name FROM public.vendors WHERE id = ar.entity_id)
      WHEN ar.entity_type = 'style' THEN (SELECT name FROM public.fabric_styles WHERE id = ar.entity_id)
      WHEN ar.entity_type = 'variant' THEN (SELECT name FROM public.fabric_variants WHERE id = ar.entity_id)
      ELSE 'Unknown'
    END AS entity_name,
    ar.requested_by,
    requester.email AS requested_by_email,
    requester.raw_user_meta_data->>'full_name' AS requested_by_name,
    ar.requested_at,
    ar.expires_at
  FROM public.approval_requests ar
  INNER JOIN auth.users requester ON requester.id = ar.requested_by
  INNER JOIN public.vendors v ON v.event_id = p_event_id
  WHERE ar.status = 'pending'
    AND (
      (ar.entity_type = 'vendor' AND ar.entity_id = v.id)
      OR (ar.entity_type = 'style' AND EXISTS (
        SELECT 1 FROM public.fabric_styles WHERE id = ar.entity_id AND vendor_id = v.id
      ))
      OR (ar.entity_type = 'variant' AND EXISTS (
        SELECT 1 FROM public.fabric_variants var
        INNER JOIN public.fabric_styles s ON s.id = var.style_id
        WHERE var.id = ar.entity_id AND s.vendor_id = v.id
      ))
    )
  ORDER BY ar.requested_at ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.request_approval TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_approval TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approval_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_approvals TO authenticated;
