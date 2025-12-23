-- EMERGENCY REPAIR: Fix "Database error saving new user"
-- Run this in Supabase SQL Editor

-- 1. Ensure columns exist in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Ensure Department Enum is correct
-- If this fails, it means you have data that doesn't fit 'CMS', etc.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_type') THEN
        CREATE TYPE department_type AS ENUM ('CMS', 'Digital Marketing', 'Management', 'MERN Stack', 'Sales', 'UI/UX');
    END IF;
END $$;

-- 3. Re-create the trigger function with extra safety and logging
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role public.user_role;
  user_dept public.department_type;
  user_phone TEXT;
  user_address TEXT;
BEGIN
  -- Log start for debugging (Check Supabase Logs -> Postgres)
  RAISE LOG 'handle_new_user started for email: %', new.email;

  -- Extract metadata with safe defaults
  user_name := COALESCE(new.raw_user_meta_data->>'name', 'User');
  user_phone := new.raw_user_meta_data->>'phone';
  user_address := new.raw_user_meta_data->>'address';
  
  -- Safe casting for Role
  BEGIN
    user_role := (new.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Role cast failed, defaulting to employee';
    user_role := 'employee';
  END;
  
  -- Safe casting for Department
  BEGIN
    user_dept := (new.raw_user_meta_data->>'department')::public.department_type;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Department cast failed, defaulting to CMS';
    user_dept := 'CMS';
  END;
  
  -- Insert with detailed error reporting
  BEGIN
    INSERT INTO public.profiles (id, email, name, role, department, phone, address)
    VALUES (new.id, new.email, user_name, user_role, user_dept, user_phone, user_address);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'INSERT into profiles failed: %', SQLERRM;
    -- We don't want to crash the whole signup if profile fails, 
    -- but usually Supabase requires this trigger to succeed.
    -- Re-throwing to surface the error for now so we can debug.
    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach trigger if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Database repair complete
