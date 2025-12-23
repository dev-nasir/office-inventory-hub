-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RESET / CLEANUP (Optional: Remove if you want to keep data)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS department_type CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS inventory_status CASCADE;
DROP TYPE IF EXISTS action_type CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.history CASCADE;

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE department_type AS ENUM ('CMS', 'Digital Marketing', 'Management', 'MERN Stack', 'Sales', 'UI/UX');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE inventory_status AS ENUM ('assigned', 'returned', 'available');
CREATE TYPE action_type AS ENUM ('assigned', 'returned', 'requested', 'approved', 'rejected');

-- 2. PROFILES (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role user_role DEFAULT 'employee',
  department department_type,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. INVENTORY ITEMS
CREATE TABLE public.inventory_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 4. ASSIGNMENTS (Employee Inventory)
CREATE TABLE public.assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id) NOT NULL,
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  status inventory_status DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 5. REQUESTS
CREATE TABLE public.requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id) NOT NULL,
  item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status request_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 6. HISTORY
CREATE TABLE public.history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action_type action_type NOT NULL,
  employee_id UUID REFERENCES public.profiles(id),
  item_id UUID REFERENCES public.inventory_items(id),
  quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- PROFILES
-- Everyone can read profiles (needed for request forms etc)
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Only user can update their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- INVENTORY
-- Everyone can read inventory
CREATE POLICY "Inventory is viewable by everyone" 
ON public.inventory_items FOR SELECT USING (true);

-- Admins can manage all inventory
CREATE POLICY "Admins can manage all inventory" 
ON public.inventory_items FOR ALL USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- Employees can create inventory items
CREATE POLICY "Employees can create inventory items"
ON public.inventory_items FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Employees can update their own items
CREATE POLICY "Employees can update own items"
ON public.inventory_items FOR UPDATE
USING (auth.uid() = created_by);

-- Employees can delete their own items
CREATE POLICY "Employees can delete own items"
ON public.inventory_items FOR DELETE
USING (auth.uid() = created_by);


-- ASSIGNMENTS
-- Users view their own
CREATE POLICY "Users view their own assignments" 
ON public.assignments FOR SELECT USING (auth.uid() = employee_id);

-- Admins view all
CREATE POLICY "Admins view all assignments" 
ON public.assignments FOR SELECT USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- REQUESTS
-- Users view their own
CREATE POLICY "Users view their own requests" 
ON public.requests FOR SELECT USING (auth.uid() = employee_id);

-- Admins view all
CREATE POLICY "Admins view all requests" 
ON public.requests FOR SELECT USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- Users can create requests 
CREATE POLICY "Users can create requests" 
ON public.requests FOR INSERT WITH CHECK (auth.uid() = employee_id);

-- HISTORY
-- Viewable by admins
CREATE POLICY "History viewable by admins" 
ON public.history FOR SELECT USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- TRIGGER FOR NEW USER CREATION (Auto-Profile)
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
