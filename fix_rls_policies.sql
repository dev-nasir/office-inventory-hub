-- Fix RLS Policies for Assignments and History

-- 1. ASSIGNMENTS: Allow admins to manage all assignments
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.assignments;
CREATE POLICY "Admins can manage all assignments" 
ON public.assignments FOR ALL USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- 2. HISTORY: Allow admins and employees to insert history records
DROP POLICY IF EXISTS "Anyone can insert history" ON public.history;
CREATE POLICY "Anyone can insert history" 
ON public.history FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Also ensure admins can view all history (existing policy might need update)
DROP POLICY IF EXISTS "History viewable by admins" ON public.history;
CREATE POLICY "History viewable by admins" 
ON public.history FOR SELECT USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- 3. REQUESTS: Allow admins to update request status
DROP POLICY IF EXISTS "Admins can update requests" ON public.requests;
CREATE POLICY "Admins can update requests" 
ON public.requests FOR UPDATE USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);
