-- ARCH-10: Split RLS `FOR ALL` policies into role-aware separate policies
--
-- Previously, 7 tables used `FOR ALL` policies allowing any event member
-- (including viewers) to INSERT, UPDATE, and DELETE. This splits them into
-- separate per-operation policies with DELETE restricted to owner/admin.
--
-- Each table already has a separate SELECT policy that is not touched here.

-- ============================================================================
-- vendor_images
-- ============================================================================
DROP POLICY IF EXISTS "members can manage vendor_images" ON public.vendor_images;

CREATE POLICY "members can insert vendor_images"
  ON public.vendor_images FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update vendor_images"
  ON public.vendor_images FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id))
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete vendor_images"
  ON public.vendor_images FOR DELETE TO authenticated
  USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

-- ============================================================================
-- fabric_styles
-- ============================================================================
DROP POLICY IF EXISTS "members can manage fabric_styles" ON public.fabric_styles;

CREATE POLICY "members can insert fabric_styles"
  ON public.fabric_styles FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update fabric_styles"
  ON public.fabric_styles FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id))
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete fabric_styles"
  ON public.fabric_styles FOR DELETE TO authenticated
  USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

-- ============================================================================
-- fabric_variants
-- ============================================================================
DROP POLICY IF EXISTS "members can manage fabric_variants" ON public.fabric_variants;

CREATE POLICY "members can insert fabric_variants"
  ON public.fabric_variants FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update fabric_variants"
  ON public.fabric_variants FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id))
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete fabric_variants"
  ON public.fabric_variants FOR DELETE TO authenticated
  USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

-- ============================================================================
-- inventory_records
-- ============================================================================
DROP POLICY IF EXISTS "members can manage inventory_records" ON public.inventory_records;

CREATE POLICY "members can insert inventory_records"
  ON public.inventory_records FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update inventory_records"
  ON public.inventory_records FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id))
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete inventory_records"
  ON public.inventory_records FOR DELETE TO authenticated
  USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

-- ============================================================================
-- fabric_images
-- ============================================================================
DROP POLICY IF EXISTS "members can manage fabric_images" ON public.fabric_images;

CREATE POLICY "members can insert fabric_images"
  ON public.fabric_images FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update fabric_images"
  ON public.fabric_images FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id))
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete fabric_images"
  ON public.fabric_images FOR DELETE TO authenticated
  USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

-- ============================================================================
-- scan_sessions
-- ============================================================================
DROP POLICY IF EXISTS "members can manage scan_sessions" ON public.scan_sessions;

CREATE POLICY "members can insert scan_sessions"
  ON public.scan_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update scan_sessions"
  ON public.scan_sessions FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id))
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete scan_sessions"
  ON public.scan_sessions FOR DELETE TO authenticated
  USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

-- ============================================================================
-- price_history
-- ============================================================================
DROP POLICY IF EXISTS "members can manage price_history" ON public.price_history;

CREATE POLICY "members can insert price_history"
  ON public.price_history FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update price_history"
  ON public.price_history FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id))
  WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "owners can delete price_history"
  ON public.price_history FOR DELETE TO authenticated
  USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));
