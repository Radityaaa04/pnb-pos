-- ============================================================
-- Migration: Add payment_method column to transactions
-- ============================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'qris', 'transfer'));
