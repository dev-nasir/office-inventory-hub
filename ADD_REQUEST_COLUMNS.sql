-- ADD URGENCY AND EXPECTED DATE COLUMNS
-- Run this in Supabase SQL Editor

ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS expected_date DATE,
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'requests' 
AND column_name IN ('urgency', 'expected_date', 'brand');
