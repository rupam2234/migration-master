CREATE INDEX IF NOT EXISTS idx_exported_item_ownership_job
  ON exported_item_ownership (first_job_id);

-- Link an export to the verified credit purchase that funded it. This keeps
-- coupon/payment attribution on the export job instead of guessing later.
ALTER TABLE export_pipeline_jobs
  ADD COLUMN IF NOT EXISTS payment_transaction_id BIGINT REFERENCES payment_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_percent INTEGER;

CREATE INDEX IF NOT EXISTS idx_export_pipeline_jobs_payment_transaction
  ON export_pipeline_jobs (payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL;
