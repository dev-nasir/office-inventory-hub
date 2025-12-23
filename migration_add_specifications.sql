-- Migration: Add specifications column for dynamic category fields
-- Run this in Supabase SQL Editor

ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;
