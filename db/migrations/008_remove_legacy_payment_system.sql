-- 008_remove_legacy_payment_system.sql
-- Canonical billing tables:
--   user_credit_balances, credit_ledger, payment_transactions
-- Canonical export tables:
--   export_pipeline_jobs, export_job_batches, export_job_parts
--
-- Legacy pay-per-export and fixed-pricing tables are no longer part of the
-- application. Existing legacy rows are copied to legacy_payment_archive by
-- the one-time cleanup command before this migration is applied.

CREATE TABLE IF NOT EXISTS legacy_payment_archive (
    id BIGSERIAL PRIMARY KEY,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_table, source_id)
);

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS exported_items;
DROP TABLE IF EXISTS export_jobs;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS pricing_tiers;
