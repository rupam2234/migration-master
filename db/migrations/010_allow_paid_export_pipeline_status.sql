-- 010_allow_paid_export_pipeline_status.sql
-- PAID means credits were successfully deducted and the job is eligible for
-- processing. PROCESSING/READY/FAILED remain the active pipeline states.

ALTER TABLE export_pipeline_jobs
  DROP CONSTRAINT IF EXISTS export_pipeline_jobs_status_check;

ALTER TABLE export_pipeline_jobs
  ADD CONSTRAINT export_pipeline_jobs_status_check
  CHECK (status IN ('AWAITING_DATA', 'PROCESSING', 'PAID', 'READY', 'FAILED'));
