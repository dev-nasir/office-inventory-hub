-- Complete RLS Policy Fix for Admin Request Management
-- Run this in your Supabase SQL Editor to enable admin access to requests

-- 1. Ensure admins can UPDATE requests (approve, reject, complete)
DROP POLICY IF EXISTS "Admins can update requests" ON public.requests;
CREATE POLICY "Admins can update requests" 
ON public.requests FOR UPDATE USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- 2. Ensure admins can manage all assignments
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.assignments;
CREATE POLICY "Admins can manage all assignments" 
ON public.assignments FOR ALL USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- 3. Allow authenticated users to insert history records
DROP POLICY IF EXISTS "Anyone can insert history" ON public.history;
CREATE POLICY "Anyone can insert history" 
ON public.history FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Verify the policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('requests', 'assignments', 'history')
ORDER BY tablename, policyname;
