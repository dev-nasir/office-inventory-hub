-- DIAGNOSTIC SCRIPT - Run this to see what's wrong
-- Copy the results and share them with me

-- 1. Check if item_name column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'requests' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check all RLS policies on requests table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'requests';

-- 3. Check if there are any requests in the database
SELECT 
  id,
  employee_id,
  item_id,
  item_name,
  quantity,
  status,
  created_at
FROM public.requests
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check your admin user's role
SELECT 
  id,
  email,
  name,
  role
FROM public.profiles
WHERE role = 'admin';

-- 5. Test if admin can see requests (run this while logged in as admin)
SELECT COUNT(*) as total_requests
FROM public.requests;
