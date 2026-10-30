-- Enable Realtime on key tables for multi-user awareness
--
-- ARCH-19: Subscribe to INSERT, UPDATE, DELETE on vendors,
-- fabric_styles, and fabric_variants so that TanStack Query
-- caches are automatically invalidated when another user mutates data.

ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fabric_styles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fabric_variants;
