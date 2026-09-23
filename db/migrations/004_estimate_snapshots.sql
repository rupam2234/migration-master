-- Estimate snapshots: the estimator counts every resource in one paced pass and
-- commits the whole set in a single atomic statement, so a dashboard renders a
-- complete snapshot or keeps waiting — never a half-resolved grid where some
-- cards carry numbers and others spin on "estimating" forever.
--
--   resource_counts → one row per resource. `status`/`reason` record resources
--                     that cannot be counted up front (no cheap count endpoint,
--                     missing scope, …) so the UI can settle on a real answer.
--   estimate_runs   → one row per project: the in-progress claim (so concurrent
--                     dashboard loads never double-hit the source APIs) plus the
--                     completion stamp the cache freshness check reads.
--
-- Idempotent — safe to re-run.

ALTER TABLE resource_counts ADD COLUMN IF NOT EXISTS direction TEXT;

ALTER TABLE resource_counts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'OK';

ALTER TABLE resource_counts ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE TABLE IF NOT EXISTS estimate_runs (
    project       TEXT PRIMARY KEY,
    direction     TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'RUNNING',
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    total_credits BIGINT,
    error         TEXT
);

CREATE INDEX IF NOT EXISTS idx_resource_counts_fetched_at
    ON resource_counts (fetched_at);
