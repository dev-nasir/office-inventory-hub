# Supabase Setup Checklist

## Current Issue: "Database error saving new user"

This error occurs when the trigger function fails. Here's how to debug:

### Step 1: Check Supabase Logs
1. Go to **Supabase Dashboard** → **Logs** → **Postgres Logs**
2. Try signing up again
3. Look for error messages - they will show the exact SQL error

### Step 2: Verify Trigger Exists
Run this in SQL Editor to check if trigger is properly installed:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Step 3: Test Trigger Manually
Run this to see if the function works:
```sql
SELECT public.handle_new_user();
```

### Step 4: Disable Email Confirmation (Temporary)
1. Go to **Authentication** → **Settings** → **Email Auth**
2. Turn OFF "Confirm email"
3. Try signing up again

### Step 5: Alternative - Drop and Recreate Trigger
If the trigger is causing issues, run this to start fresh:

```sql
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate with simpler version
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, department)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    'employee',
    'Engineering'
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

This simplified version:
- Always sets role to 'employee' and department to 'Engineering'
- Logs errors instead of failing
- Won't block user creation even if profile insert fails

### Step 6: Check for Existing Users
The error might also occur if you're trying to create a user that already exists:

```sql
-- Check auth.users
SELECT email FROM auth.users WHERE email = 'your-test-email@gmail.com';

-- Check profiles
SELECT email FROM public.profiles WHERE email = 'your-test-email@gmail.com';

-- If user exists, delete them:
DELETE FROM public.profiles WHERE email = 'your-test-email@gmail.com';
DELETE FROM auth.users WHERE email = 'your-test-email@gmail.com';
```

## What to do next:
1. Check the Postgres Logs for the actual error
2. Share the error message with me
3. Try the simplified trigger version above
