-- COMPLETE FIX FOR REQUEST SYSTEM
-- Run this entire script in your Supabase SQL Editor
-- This will enable: manual item names + admin access to requests

-- ============================================
-- PART 1: Enable Manual Item Names
-- ============================================

-- Make item_id nullable (allow requests without linking to inventory)
ALTER TABLE public.requests ALTER COLUMN item_id DROP NOT NULL;

-- Add item_name column for manual entries
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS item_name TEXT;

-- ============================================
-- PART 2: Fix Admin Access to Requests
-- ============================================

-- Allow admins to UPDATE requests (approve, reject, complete)
DROP POLICY IF EXISTS "Admins can update requests" ON public.requests;
CREATE POLICY "Admins can update requests" 
ON public.requests FOR UPDATE USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- Ensure admins can manage all assignments
DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.assignments;
CREATE POLICY "Admins can manage all assignments" 
ON public.assignments FOR ALL USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- Allow authenticated users to insert history records
DROP POLICY IF EXISTS "Anyone can insert history" ON public.history;
CREATE POLICY "Anyone can insert history" 
ON public.history FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- PART 3: Verify Everything is Working
-- ============================================

-- Check the requests table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'requests' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the policies are in place
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('requests', 'assignments', 'history')
ORDER BY tablename, policyname;
