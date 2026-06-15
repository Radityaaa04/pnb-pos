-- ============================================================
-- Migration: Add Auth Profiles and RLS
-- ============================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'kasir' CHECK (role IN ('owner', 'kasir')),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count INT;
BEGIN
  -- Count existing profiles to determine if this is the first user
  SELECT count(*) INTO user_count FROM public.profiles;
  
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', CASE WHEN user_count = 0 THEN 'owner' ELSE 'kasir' END)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Owners can read all profiles"
  ON profiles FOR SELECT
  USING (is_owner());

CREATE POLICY "Owners can update profiles"
  ON profiles FOR UPDATE
  USING (is_owner());

CREATE POLICY "Owners can delete profiles"
  ON profiles FOR DELETE
  USING (is_owner());

-- Drop old public policies
DROP POLICY IF EXISTS "Allow public read on products" ON products;
DROP POLICY IF EXISTS "Allow public update on products" ON products;
DROP POLICY IF EXISTS "Allow public insert on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow public read on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow public read on vouchers" ON vouchers;
DROP POLICY IF EXISTS "Allow public insert on vouchers" ON vouchers;
DROP POLICY IF EXISTS "Allow public update on vouchers" ON vouchers;
DROP POLICY IF EXISTS "Allow public delete on vouchers" ON vouchers;

-- Products Policies
CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_owner());

CREATE POLICY "Owners can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_owner());

CREATE POLICY "Owners can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (is_owner());

-- Transactions Policies
CREATE POLICY "Authenticated users can read transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Vouchers Policies
CREATE POLICY "Authenticated users can read vouchers"
  ON vouchers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can insert vouchers"
  ON vouchers FOR INSERT
  TO authenticated
  WITH CHECK (is_owner());

CREATE POLICY "Owners can update vouchers"
  ON vouchers FOR UPDATE
  TO authenticated
  USING (is_owner());

CREATE POLICY "Owners can delete vouchers"
  ON vouchers FOR DELETE
  TO authenticated
  USING (is_owner());
