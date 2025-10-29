-- Add is_active field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index on is_active for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Add comment
COMMENT ON COLUMN public.profiles.is_active IS 'Whether the profile is active (true) or frozen (false)';

