-- Drop all setup/suggestion related tables and fields

-- Drop suggestions table (stores all setup suggestions)
DROP TABLE IF EXISTS public.suggestions CASCADE;

-- Drop info_requests table (stores profile information requests)
DROP TABLE IF EXISTS public.info_requests CASCADE;

-- Remove matchmaker_id from profiles (was used for single-matchmaker association)
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS matchmaker_id;

-- Add comment explaining cleanup
COMMENT ON TABLE public.profiles IS 'User profiles with admin approval workflow. Setup/suggestion functionality removed.';

