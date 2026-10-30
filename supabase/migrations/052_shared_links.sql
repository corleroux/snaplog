-- Public Sharing Links
-- Allows sharing event catalogues via public tokens
--
-- Features:
-- - Unique share tokens for events
-- - Optional expiration dates
-- - Optional password protection
-- - Access tracking

-- Share links table
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT (encode(gen_random_bytes(16), 'hex')),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT,
  description TEXT,
  password_hash TEXT, -- bcrypt hash if password protected
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_share_links_event_id ON public.share_links(event_id);
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON public.share_links(expires_at) WHERE is_active = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_share_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER share_links_updated_at
  BEFORE UPDATE ON public.share_links
  FOR EACH ROW
  EXECUTE FUNCTION update_share_links_updated_at();

-- RLS Policies
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Users can see share links for events they're members of
CREATE POLICY "Users can view share links for their events"
  ON public.share_links
  FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM public.event_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create share links for their events
CREATE POLICY "Users can create share links for their events"
  ON public.share_links
  FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT event_id FROM public.event_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );

-- Users can update their own share links
CREATE POLICY "Users can update their own share links"
  ON public.share_links
  FOR UPDATE
  USING (
    created_by = auth.uid()
    AND event_id IN (
      SELECT event_id FROM public.event_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Users can delete their own share links
CREATE POLICY "Users can delete their own share links"
  ON public.share_links
  FOR DELETE
  USING (
    created_by = auth.uid()
  );

-- Public access for valid tokens (used by API function)
CREATE POLICY "Public access via valid token function"
  ON public.share_links
  FOR SELECT
  USING (is_active = true);

-- Helper function to access share link by token (bypasses RLS for public access)
CREATE OR REPLACE FUNCTION public.get_share_link_by_token(token_param TEXT)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  name TEXT,
  description TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  password_hash TEXT,
  requires_password BOOLEAN
) SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.event_id,
    sl.name,
    sl.description,
    sl.expires_at,
    sl.is_active,
    sl.password_hash,
    (sl.password_hash IS NOT NULL) as requires_password
  FROM public.share_links sl
  WHERE sl.token = token_param
    AND sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > NOW());
END;
$$;

-- Helper function to increment access count
CREATE OR REPLACE FUNCTION public.increment_share_link_access(share_link_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.share_links
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = share_link_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_share_link_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_link_access TO authenticated;
