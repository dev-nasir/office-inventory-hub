-- Manually confirm all unconfirmed users in Supabase Auth
-- Run this in the Supabase SQL Editor

-- This script updates all users who haven't confirmed their email yet
-- It sets their email_confirmed_at timestamp and confirmed_at timestamp

UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE 
  email_confirmed_at IS NULL;

-- Optional: Verify the update
-- SELECT id, email, email_confirmed_at, confirmed_at FROM auth.users;
