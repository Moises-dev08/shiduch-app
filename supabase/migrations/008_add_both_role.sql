-- Add "both" as a valid role option
-- This allows users to be both single and matchmaker

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('single', 'matchmaker', 'both'));

