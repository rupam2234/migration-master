-- Queue lifecycle and active-export controls.
-- A user may queue multiple resources, but only one active job per resource
-- may be created, while the processing endpoint applies the global concurrency cap.
ALTER TABLE export_pipeline_jobs
  DROP CONSTRAINT IF EXISTS export_pipeline_jobs_status_check;

ALTER TABLE export_pipeline_jobs
  ADD CONSTRAINT export_pipeline_jobs_status_check
  CHECK (status IN ('AWAITING_DATA', 'QUEUED', 'PROCESSING', 'PAID', 'READY', 'FAILED'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_export_pipeline_jobs_active_resource
  ON export_pipeline_jobs (user_id, project, direction, resource)
  WHERE status IN ('QUEUED', 'PAID', 'PROCESSING');

CREATE INDEX IF NOT EXISTS idx_export_pipeline_jobs_queue
  ON export_pipeline_jobs (status, created_at)
  WHERE status IN ('QUEUED', 'PAID');
