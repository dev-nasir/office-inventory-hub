-- Migration: Add created_by column and employee permissions
-- Run this in Supabase SQL Editor

-- Step 1: Add created_by column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Step 2: Drop old policy
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory_items;

-- Step 3: Create new policies
CREATE POLICY "Admins can manage all inventory" 
ON public.inventory_items FOR ALL USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

CREATE POLICY "Employees can create inventory items"
ON public.inventory_items FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Employees can update own items"
ON public.inventory_items FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Employees can delete own items"
ON public.inventory_items FOR DELETE
USING (auth.uid() = created_by);
