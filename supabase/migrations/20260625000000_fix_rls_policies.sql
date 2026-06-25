-- ============================================================
-- Migration: Fix overly permissive RLS policies
-- Restricts insert/read to authenticated users only
-- ============================================================

-- Drop permissive public policies on transaction_items
DROP POLICY IF EXISTS "Allow public insert on transaction_items" ON transaction_items;
DROP POLICY IF EXISTS "Allow public read on transaction_items" ON transaction_items;

-- Drop permissive public policies on stock_logs
DROP POLICY IF EXISTS "Allow public insert on stock_logs" ON stock_logs;
DROP POLICY IF EXISTS "Allow public read on stock_logs" ON stock_logs;

-- Recreate with authenticated-only access
CREATE POLICY "Authenticated users can insert transaction_items"
  ON transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read transaction_items"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock_logs"
  ON stock_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read stock_logs"
  ON stock_logs FOR SELECT
  TO authenticated
  USING (true);
