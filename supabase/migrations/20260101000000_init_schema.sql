-- ============================================================
-- Migration: Initial Schema
-- Creates core tables: products & transactions
-- ============================================================

-- TABLE: products
CREATE TABLE IF NOT EXISTS products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  price      INTEGER NOT NULL CHECK (price >= 0),
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total       INTEGER NOT NULL CHECK (total >= 0),
  items_count INTEGER NOT NULL CHECK (items_count > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow all operations for authenticated & anon (adjust as needed for production)
CREATE POLICY "Allow public read on products"
  ON products FOR SELECT USING (true);

CREATE POLICY "Allow public insert on transactions"
  ON transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on transactions"
  ON transactions FOR SELECT USING (true);

CREATE POLICY "Allow public update on products"
  ON products FOR UPDATE USING (true);

-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
