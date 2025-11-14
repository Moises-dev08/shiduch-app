-- Restructure roles: Remove 'single', rename 'both' to 'single'
-- New roles: 'matchmaker' (only matching) and 'single' (can date AND matchmake)

-- Step 1: Update existing 'both' profiles to 'single'
UPDATE public.profiles
SET role = 'single'
WHERE role = 'both';

-- Step 2: Update existing 'single' profiles to 'single' (they become the new single with matchmaking capability)
-- (This keeps them as 'single' but now with full capabilities)

-- Step 3: Update the constraint to only allow 'matchmaker' and 'single'
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('matchmaker', 'single'));

-- Add comment explaining new role structure
COMMENT ON COLUMN public.profiles.role IS 'Profile role: single (can date and matchmake), matchmaker (only matchmaking)';

