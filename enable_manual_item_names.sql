-- SQL to enable manual item name entry in requests
-- Run this in your Supabase SQL Editor

-- 1. Make item_id nullable (allow requests without linking to inventory)
ALTER TABLE public.requests ALTER COLUMN item_id DROP NOT NULL;

-- 2. Add item_name column for manual entries
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'requests' AND table_schema = 'public'
AND column_name IN ('item_id', 'item_name')
ORDER BY ordinal_position;
