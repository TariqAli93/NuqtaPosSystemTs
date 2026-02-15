-- Migration: Add receipt print status tracking to sales table
-- Date: 2026-02-12

ALTER TABLE sales ADD COLUMN print_status TEXT DEFAULT 'pending';
ALTER TABLE sales ADD COLUMN printed_at TEXT;
ALTER TABLE sales ADD COLUMN print_error TEXT;
