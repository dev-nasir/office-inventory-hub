-- COMPLETE DIAGNOSTIC AND FIX FOR nasirnx5289@gmail.com
-- Run each section and share the results

-- ============================================
-- SECTION 1: Check if nasirnx5289@gmail.com is admin
-- ============================================
SELECT id, email, name, role
FROM public.profiles
WHERE email = 'nasirnx5289@gmail.com';

-- Expected: Should show role = 'admin'
-- If it shows 'employee', run this:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'nasirnx5289@gmail.com';


-- ============================================
-- SECTION 2: Check if there are any requests
-- ============================================
SELECT 
  id,
  employee_id,
  item_id,
  item_name,
  quantity,
  status,
  notes,
  created_at
FROM public.requests
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should show at least one request
-- If empty, no requests have been submitted yet


-- ============================================
-- SECTION 3: Check RLS policies on requests
-- ============================================
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'requests'
ORDER BY policyname;

-- Expected: Should show policies including "Admins view all requests" and "Admins can update requests"


-- ============================================
-- SECTION 4: Test if admin can see requests
-- ============================================
-- This simulates what the admin query does
-- Run this while logged in as nasirnx5289@gmail.com in Supabase
SELECT COUNT(*) as total_requests_admin_can_see
FROM public.requests;

-- Expected: Should show the same count as SECTION 2


-- ============================================
-- SECTION 5: Check if item_name column exists
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'requests' AND table_schema = 'public'
AND column_name IN ('item_id', 'item_name', 'employee_id', 'status')
ORDER BY ordinal_position;

-- Expected: Should show item_name column exists and item_id is nullable


-- ============================================
-- FIX: If nasirnx5289@gmail.com is not admin, run this:
-- ============================================
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'nasirnx5289@gmail.com';

-- Then verify:
SELECT id, email, name, role
FROM public.profiles
WHERE email = 'nasirnx5289@gmail.com';
