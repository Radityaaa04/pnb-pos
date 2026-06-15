-- ============================================================
-- Migration: Add Vouchers
-- Creates vouchers table and adds voucher columns to transactions
-- ============================================================

-- TABLE: vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  min_purchase INTEGER DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ALTER TABLE: transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS voucher_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;

-- Enable Row Level Security (RLS)
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow all operations for authenticated & anon (adjust as needed for production)
CREATE POLICY "Allow public read on vouchers"
  ON vouchers FOR SELECT USING (true);

CREATE POLICY "Allow public insert on vouchers"
  ON vouchers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on vouchers"
  ON vouchers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on vouchers"
  ON vouchers FOR DELETE USING (true);
