-- Migration: Shared Links for Catalogues
-- Purpose: Allow users to generate shareable public links for catalogues

-- Shared links table
CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('event_catalogue', 'vendor', 'style')),

  -- Reference to the entity being shared
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  style_id UUID REFERENCES public.fabric_styles(id) ON DELETE CASCADE,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL means no expiration
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,

  -- Optional password protection
  password_hash TEXT, -- bcrypt hash if password protected
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Constraints
  CONSTRAINT shared_links_one_entity CHECK (
    (event_id IS NOT NULL)::integer +
    (vendor_id IS NOT NULL)::integer +
    (style_id IS NOT NULL)::integer = 1
  )
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_event_id ON public.shared_links(event_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_vendor_id ON public.shared_links(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_style_id ON public.shared_links(style_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_expires_at ON public.shared_links(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Users can view links they created
CREATE POLICY "Users can view their own shared links"
  ON public.shared_links
  FOR SELECT
  USING (auth.uid() = created_by);

-- Users can create shared links
CREATE POLICY "Users can create shared links"
  ON public.shared_links
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own links
CREATE POLICY "Users can update their own shared links"
  ON public.shared_links
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own links
CREATE POLICY "Users can delete their own shared links"
  ON public.shared_links
  FOR DELETE
  USING (auth.uid() = created_by);

-- Public access for valid tokens (used by the public view route)
CREATE POLICY "Public can access active shared links by token"
  ON public.shared_links
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_links TO authenticated;
GRANT SELECT ON public.shared_links TO anon;

-- Function to increment access count
CREATE OR REPLACE FUNCTION public.increment_link_access(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shared_links
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION public.increment_link_access(UUID) TO authenticated, anon;
