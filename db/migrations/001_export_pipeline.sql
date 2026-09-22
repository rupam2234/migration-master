-- Phase 1 export pipeline: server-side, resumable, chunked export jobs.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS export_pipeline_jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           TEXT NOT NULL,
    project           TEXT NOT NULL,
    direction         TEXT NOT NULL CHECK (direction IN ('shopify_to_wp', 'wp_to_shopify')),
    resource          TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'AWAITING_DATA'
                      CHECK (status IN ('AWAITING_DATA', 'PROCESSING', 'READY', 'FAILED')),
    total_items       INTEGER NOT NULL DEFAULT 0,
    total_batches     INTEGER NOT NULL DEFAULT 0,
    uploaded_batches  INTEGER NOT NULL DEFAULT 0,
    processed_batches INTEGER NOT NULL DEFAULT 0,
    part_count        INTEGER NOT NULL DEFAULT 0,
    resource_label    TEXT,
    cfg               JSONB,
    error             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_pipeline_jobs_user
    ON export_pipeline_jobs (user_id, project, created_at DESC);

-- Source records, chunked so uploads/processing stay bounded.
-- payload = gzip(JSON(records)) encoded as base64.
CREATE TABLE IF NOT EXISTS export_job_batches (
    job_id     UUID NOT NULL REFERENCES export_pipeline_jobs (id) ON DELETE CASCADE,
    seq        INTEGER NOT NULL,
    payload    TEXT NOT NULL,
    processed  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (job_id, seq)
);

-- Generated artifact files, one row per file (WXR part / CSV part).
-- content = gzip(artifact text) encoded as base64.
CREATE TABLE IF NOT EXISTS export_job_parts (
    job_id     UUID NOT NULL REFERENCES export_pipeline_jobs (id) ON DELETE CASCADE,
    part_number INTEGER NOT NULL,
    filename   TEXT NOT NULL,
    content    TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (job_id, part_number)
);

-- When a batch was last marked as processed. Null for unprocessed batches.
ALTER TABLE export_job_batches
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Tracks which batch is currently being processed, for live progress reporting.
ALTER TABLE export_pipeline_jobs
    ADD COLUMN IF NOT EXISTS current_batch_seq INTEGER;

-- Human-readable label for the exported resource (mirrors the dashboard's
-- resource display). Added after the table was created in v1.
ALTER TABLE export_pipeline_jobs
    ADD COLUMN IF NOT EXISTS resource_label TEXT;
