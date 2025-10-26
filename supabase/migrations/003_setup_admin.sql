-- This script should be run AFTER the admin user signs up with the app
-- 
-- INSTRUCTIONS:
-- 1. Sign up in the app using: bichadforever@gmail.com / bichadforever123456
-- 2. Get the user_id from auth.users table (see query below)
-- 3. Replace USER_ID_HERE with the actual UUID in the INSERT statement
-- 4. Run this script

-- Step 1: Find the user ID (run this first)
-- SELECT id, email FROM auth.users WHERE email = 'bichadforever@gmail.com';

-- Step 2: Insert into admin_users (replace the USER_ID_HERE)
-- INSERT INTO public.admin_users (user_id, email)
-- VALUES ('USER_ID_HERE', 'bichadforever@gmail.com')
-- ON CONFLICT (email) DO NOTHING;

-- Alternative: Run this after signup to automatically add the user as admin
INSERT INTO public.admin_users (user_id, email)
SELECT id, email 
FROM auth.users 
WHERE email = 'bichadforever@gmail.com'
ON CONFLICT (email) DO NOTHING;

-- Verify admin was created
SELECT * FROM public.admin_users WHERE email = 'bichadforever@gmail.com';

