-- ENABLE EMPLOYEE EDIT/DELETE FOR PENDING REQUESTS
-- Run this in Supabase SQL Editor

-- 1. Allow employees to UPDATE their own requests (only if status is pending)
DROP POLICY IF EXISTS "Users can update own pending requests" ON public.requests;
CREATE POLICY "Users can update own pending requests" 
ON public.requests FOR UPDATE 
USING (
  auth.uid() = employee_id 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = employee_id 
  AND status = 'pending'
);

-- 2. Allow employees to DELETE their own requests (only if status is pending)
DROP POLICY IF EXISTS "Users can delete own pending requests" ON public.requests;
CREATE POLICY "Users can delete own pending requests" 
ON public.requests FOR DELETE 
USING (
  auth.uid() = employee_id 
  AND status = 'pending'
);

-- Verify policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'requests';
