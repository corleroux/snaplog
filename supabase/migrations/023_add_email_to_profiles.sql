-- Add email column to profiles for user search
-- Note: Email is already in auth.users, this creates a cached searchable copy

-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create index for email search performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update profile with email
  INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, 'user', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;

-- Create trigger to sync email on user creation or update
CREATE TRIGGER on_auth_user_email_change
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
WHEN (NEW.email IS NOT NULL)
EXECUTE FUNCTION public.sync_user_email();

-- Sync existing users' emails
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS NULL;
