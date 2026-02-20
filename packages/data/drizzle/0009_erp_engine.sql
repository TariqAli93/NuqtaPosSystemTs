-- ============================================================
-- Migration 0009: ERP Engine Enhancements
-- Batch FIFO indexes, posting batch locking, audit indexes,
-- additional chart of accounts.
-- ============================================================

-- 1. Add status column to posting_batches for locking workflow
--    Values: 'draft', 'posted', 'locked'
ALTER TABLE posting_batches ADD COLUMN status TEXT NOT NULL DEFAULT 'posted';

-- 2. Partial index for FIFO batch depletion queries (critical for sale performance)
--    Covers: product_id lookup, expiry_date ordering, id tie-breaking
--    Only includes active batches with stock > 0
CREATE INDEX IF NOT EXISTS idx_batches_fifo_active
  ON product_batches(product_id, expiry_date, id)
  WHERE quantity_on_hand > 0 AND status = 'active';

-- 3. Partial index for unposted journal entries (used by PostPeriodUseCase)
CREATE INDEX IF NOT EXISTS idx_journal_unposted
  ON journal_entries(is_posted, entry_date)
  WHERE is_posted = 0;

-- 4. Audit log indexes for efficient entity-trail and user-activity queries
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs(entity_type, entity_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_user_time
  ON audit_logs(user_id, timestamp);

-- 5. Sale items by product (for top-selling and history queries)
CREATE INDEX IF NOT EXISTS idx_sale_items_product
  ON sale_items(product_id, sale_id);

-- 6. Additional chart of accounts for ERP (idempotent via INSERT OR IGNORE)
INSERT OR IGNORE INTO accounts (code, name, name_ar, account_type, is_system, is_active, balance)
VALUES
  ('1002', 'البنك', 'البنك', 'asset', 1, 1, 0),
  ('3001', 'رأس المال', 'رأس المال', 'equity', 1, 1, 0),
  ('3002', 'الأرباح المحتجزة', 'الأرباح المحتجزة', 'equity', 1, 1, 0),
  ('4002', 'إيرادات أخرى', 'إيرادات أخرى', 'revenue', 1, 1, 0),
  ('5002', 'مصروفات إدارية', 'مصروفات إدارية', 'expense', 1, 1, 0),
  ('5003', 'مصروفات البيع', 'مصروفات البيع', 'expense', 1, 1, 0),
  ('5004', 'خصم مسموح به', 'خصم مسموح به', 'expense', 1, 1, 0);
