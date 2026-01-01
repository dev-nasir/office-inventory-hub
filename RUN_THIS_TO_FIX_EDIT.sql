-- RUN THIS TO FIX EDIT ISSUE
-- This enables the permissions required for editing requests.

-- 1. DROP old restricted policies
DROP POLICY IF EXISTS "Users can update own pending requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete own pending requests" ON public.requests;

-- 2. CREATE correct policies
CREATE POLICY "Users can update own pending requests" 
ON public.requests FOR UPDATE 
USING (
  auth.uid() = employee_id 
  AND status = 'pending'
);

CREATE POLICY "Users can delete own pending requests" 
ON public.requests FOR DELETE 
USING (
  auth.uid() = employee_id 
  AND status = 'pending'
);

-- 3. CONFIRM it worked
SELECT policyname, substring(qual::text from 1 for 50) as condition
FROM pg_policies 
WHERE tablename = 'requests';
