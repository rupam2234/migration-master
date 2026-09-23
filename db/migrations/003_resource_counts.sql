-- Resource count cache for the free migration-estimation layer.
-- Counts are cheap metadata (Shopify count endpoints / WP X-WP-Total headers)
-- but still worth caching so dashboards don't re-hit source APIs on every load.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS resource_counts (
    project    TEXT NOT NULL,
    resource   TEXT NOT NULL,
    count      INTEGER,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project, resource)
);

CREATE INDEX IF NOT EXISTS idx_resource_counts_fetched_at
    ON resource_counts (fetched_at);
