-- 011_add_payment_external_transaction_id.sql
-- The live payment_transactions table predated the current migration, so
-- CREATE TABLE IF NOT EXISTS did not add this required column to it.

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction
  ON payment_transactions (transaction_id);
