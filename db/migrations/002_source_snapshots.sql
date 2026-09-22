-- Snapshot data layer: server-side, paged, deduplicated source data.
--
-- Replaces sessionStorage as the system of record for fetched records.
-- sessionStorage is a ~5MB, tab-scoped UI cache: it silently truncated large
-- stores, broke in a new tab, and forced the browser to re-upload every
-- record for export. Snapshots are paged + TTL'd and live next to the export
-- pipeline that consumes them.
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS source_snapshots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL,
    project       TEXT NOT NULL,
    direction     TEXT NOT NULL CHECK (direction IN ('shopify_to_wp', 'wp_to_shopify')),
    resource      TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'FETCHING'
                  CHECK (status IN ('FETCHING', 'READY', 'FAILED')),
    total_items   INTEGER NOT NULL DEFAULT 0,
    total_pages   INTEGER NOT NULL DEFAULT 0,
    page_size     INTEGER NOT NULL DEFAULT 100,
    source_host   TEXT,
    error         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- One live snapshot per (user, project, direction, resource): a re-fetch
-- refreshes in place instead of piling up rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_snapshots_owner
    ON source_snapshots (user_id, project, direction, resource);

CREATE INDEX IF NOT EXISTS idx_source_snapshots_expiry
    ON source_snapshots (expires_at);

-- Records, chunked so reads/writes stay bounded regardless of store size.
-- payload = gzip(JSON(records)) encoded as base64.
CREATE TABLE IF NOT EXISTS source_snapshot_pages (
    snapshot_id UUID NOT NULL REFERENCES source_snapshots (id) ON DELETE CASCADE,
    page_no     INTEGER NOT NULL,
    payload     TEXT NOT NULL,
    item_count  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snapshot_id, page_no)
);
