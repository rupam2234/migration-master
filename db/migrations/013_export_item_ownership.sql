-- 013_export_item_ownership.sql
-- Tracks successfully exported source items for the credit system. This is
-- intentionally separate from payment_transactions: ownership is an export
-- fact, not a payment fact.

CREATE TABLE IF NOT EXISTS exported_item_ownership (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('shopify_to_wp', 'wp_to_shopify')),
  resource TEXT NOT NULL,
  item_id TEXT NOT NULL CHECK (length(trim(item_id)) > 0),
  first_job_id UUID NOT NULL REFERENCES export_pipeline_jobs(id) ON DELETE CASCADE,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project, direction, resource, item_id)
);

CREATE INDEX IF NOT EXISTS idx_exported_item_ownership_lookup
  ON exported_item_ownership (user_id, project, direction, resource, item_id);

CREATE INDEX IF NOT EXISTS idx_exported_item_ownership_job
  ON exported_item_ownership (first_job_id);
