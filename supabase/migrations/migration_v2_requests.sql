-- Add 'completed' to request_status enum
-- Note: PostgreSQL doesn't support adding enum values inside a transaction easily in older versions, 
-- but Supabase/Postgres 12+ supports:
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'completed';

-- Add new columns to public.requests
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS expected_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_comment TEXT,
ADD COLUMN IF NOT EXISTS reject_reason TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Update RLS if necessary (usually 'ALL' or 'INSERT' policies already cover new columns)
-- Just ensuring the columns exist and are accessible.
