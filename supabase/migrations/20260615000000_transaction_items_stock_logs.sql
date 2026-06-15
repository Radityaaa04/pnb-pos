-- ============================================================
-- Migration: Transaction Items, Stock Logs, Cash Received
-- ============================================================

-- Tambahkan kolom cash_received ke tabel transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS cash_received INTEGER NOT NULL DEFAULT 0 CHECK (cash_received >= 0);

-- TABLE: transaction_items
-- Menyimpan detail item per transaksi
CREATE TABLE IF NOT EXISTS transaction_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  product_price  INTEGER NOT NULL CHECK (product_price >= 0),
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  subtotal       INTEGER NOT NULL CHECK (subtotal >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);

-- TABLE: stock_logs
-- Audit log setiap perubahan stok produk
CREATE TABLE IF NOT EXISTS stock_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('sale', 'restock', 'adjustment')),
  quantity    INTEGER NOT NULL,  -- positif = tambah, negatif = kurang
  stock_before INTEGER NOT NULL,
  stock_after  INTEGER NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_logs_product_id ON stock_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON stock_logs(created_at DESC);

-- RLS Policies: transaction_items
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on transaction_items"
  ON transaction_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on transaction_items"
  ON transaction_items FOR SELECT USING (true);

-- RLS Policies: stock_logs
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on stock_logs"
  ON stock_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on stock_logs"
  ON stock_logs FOR SELECT USING (true);

-- Enable realtime for transaction_items
ALTER PUBLICATION supabase_realtime ADD TABLE transaction_items;
