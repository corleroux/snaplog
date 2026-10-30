-- 030: Atomic commit stored procedures
--
-- BLOCKER-02: Wrap commit edge functions in transactions.
-- These stored procedures perform the primary record creation
-- and scan session update in a single atomic transaction.
-- No orphaned records possible on partial failure.
--
-- Parameter names match the edge function RPC call signatures exactly.
-- Column names match the actual database table schemas.

-- ============================================================================
-- commit_vendor: Create vendor + update scan session atomically
-- ============================================================================
-- Called via RPC from commit-reviewed-vendor-document edge function.

CREATE OR REPLACE FUNCTION public.commit_vendor(
  p_event_id uuid,
  p_company_name text,
  p_booth_number text,
  p_contact_person text,
  p_email text,
  p_phone text,
  p_whatsapp text,
  p_website_url text,
  p_address text,
  p_country_of_origin text,
  p_brand_names jsonb,
  p_notes text,
  p_created_by uuid,
  p_scan_session_id uuid,
  p_reviewed_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- Insert vendor
  INSERT INTO public.vendors (
    event_id, company_name, booth_number, contact_person, email, phone,
    whatsapp, website_url, address, country_of_origin, brand_names, notes,
    source, created_by, updated_by
  ) VALUES (
    p_event_id, p_company_name, p_booth_number, p_contact_person, p_email,
    p_phone, p_whatsapp, p_website_url, p_address, p_country_of_origin,
    p_brand_names, p_notes, 'scan', p_created_by, p_created_by
  )
  RETURNING id INTO v_vendor_id;

  -- Update scan session to link to the new vendor
  UPDATE public.scan_sessions
  SET
    vendor_id = v_vendor_id,
    reviewed_payload = p_reviewed_payload,
    reviewed_by = p_created_by,
    reviewed_at = now()
  WHERE id = p_scan_session_id;

  -- Return the new vendor ID
  RETURN jsonb_build_object('vendor_id', v_vendor_id);
END;
$$;

-- ============================================================================
-- commit_fabric_style: Create fabric style + update scan session atomically
-- ============================================================================
-- Called via RPC from commit-reviewed-fabric-document edge function.

CREATE OR REPLACE FUNCTION public.commit_fabric_style(
  p_event_id uuid,
  p_vendor_id uuid,
  p_item_code text,
  p_name text,
  p_composition text,
  p_category text,
  p_construction text,
  p_finish text,
  p_pattern text,
  p_width_cm numeric,
  p_width_in numeric,
  p_weight_gsm numeric,
  p_weight_ozsy numeric,
  p_season text,
  p_metadata jsonb,
  p_created_by uuid,
  p_scan_session_id uuid,
  p_reviewed_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_style_id uuid;
BEGIN
  -- Insert fabric style
  INSERT INTO public.fabric_styles (
    event_id, vendor_id, item_code, name, composition, category,
    construction, finish, pattern, width_cm, width_in, weight_gsm, weight_ozsy,
    season, metadata, source, created_by, updated_by
  ) VALUES (
    p_event_id, p_vendor_id, p_item_code, p_name, p_composition, p_category,
    p_construction, p_finish, p_pattern, p_width_cm, p_width_in, p_weight_gsm,
    p_weight_ozsy, p_season, p_metadata, 'scan', p_created_by, p_created_by
  )
  RETURNING id INTO v_style_id;

  -- Update scan session to link to the new style
  UPDATE public.scan_sessions
  SET
    style_id = v_style_id,
    reviewed_payload = p_reviewed_payload,
    reviewed_by = p_created_by,
    reviewed_at = now()
  WHERE id = p_scan_session_id;

  -- Return the new style ID
  RETURN jsonb_build_object('style_id', v_style_id);
END;
$$;
