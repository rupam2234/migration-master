-- Preserve exported-item ownership when old export jobs are cleaned up.
-- Job rows are temporary execution/artifact records, while ownership is billing data.
ALTER TABLE exported_item_ownership
  DROP CONSTRAINT IF EXISTS exported_item_ownership_first_job_id_fkey;

ALTER TABLE exported_item_ownership
  ALTER COLUMN first_job_id DROP NOT NULL;

ALTER TABLE exported_item_ownership
  ADD CONSTRAINT exported_item_ownership_first_job_id_fkey
  FOREIGN KEY (first_job_id)
  REFERENCES export_pipeline_jobs(id)
  ON DELETE SET NULL;

-- Retain the source snapshot identity for audit/debugging after snapshot cleanup.
ALTER TABLE export_pipeline_jobs
  ADD COLUMN IF NOT EXISTS snapshot_id UUID
    REFERENCES source_snapshots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_export_pipeline_jobs_snapshot
  ON export_pipeline_jobs (snapshot_id)
  WHERE snapshot_id IS NOT NULL;

-- Completed and failed jobs are temporary execution data. Active jobs are
-- never selected by the scheduled cleanup process.
CREATE INDEX IF NOT EXISTS idx_export_pipeline_jobs_cleanup
  ON export_pipeline_jobs (status, updated_at)
  WHERE status IN ('READY', 'FAILED');
