-- Migration: Update departments and add phone/address fields
-- Run this in Supabase SQL Editor

-- Step 1: Drop and recreate department_type enum with new values
ALTER TYPE department_type RENAME TO department_type_old;

CREATE TYPE department_type AS ENUM ('CMS', 'Digital Marketing', 'Management', 'MERN Stack', 'Sales', 'UI/UX');

-- Update existing profiles to use new enum (map old to new or set default)
ALTER TABLE public.profiles 
  ALTER COLUMN department DROP DEFAULT,
  ALTER COLUMN department TYPE department_type USING 'CMS'::department_type,
  ALTER COLUMN department SET DEFAULT 'CMS'::department_type;

DROP TYPE department_type_old;

-- Step 2: Add phone and address columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Step 3: Update the signup trigger to handle new fields and departments
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role user_role;
  user_dept department_type;
  user_phone TEXT;
  user_address TEXT;
BEGIN
  -- Extract metadata with defaults
  user_name := COALESCE(new.raw_user_meta_data->>'name', 'User');
  user_phone := new.raw_user_meta_data->>'phone';
  user_address := new.raw_user_meta_data->>'address';
  
  -- Handle role with proper casting
  BEGIN
    user_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    user_role := 'employee';
  END;
  
  -- Handle department with proper casting
  BEGIN
    user_dept := (new.raw_user_meta_data->>'department')::department_type;
  EXCEPTION WHEN OTHERS THEN
    user_dept := 'CMS';
  END;
  
  INSERT INTO public.profiles (id, email, name, role, department, phone, address)
  VALUES (new.id, new.email, user_name, user_role, user_dept, user_phone, user_address);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
