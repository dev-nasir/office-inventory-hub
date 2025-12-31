-- CREATE ADMIN USER
-- This script will set an existing user as admin

-- OPTION 1: Set a specific user as admin (replace with your email)
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'YOUR_ADMIN_EMAIL@example.com';

-- OPTION 2: See all users and their current roles
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- After running OPTION 2, copy the email of the user you want to make admin,
-- then run OPTION 1 with that email

-- OPTION 3: Verify the admin was created
SELECT 
  id,
  email,
  name,
  role
FROM public.profiles
WHERE role = 'admin';
