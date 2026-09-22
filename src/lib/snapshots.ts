/**
 * Snapshot data layer (Phase 2).
 *
 * The server — not the browser — owns fetched records now. A fetched
 * resource is archived as gzip-compressed, paged rows and the client only
 * ever receives metadata plus a bounded preview page:
 *
 *   source_snapshots       → one live row per (user, project, dir, resource)
 *   source_snapshot_pages  → 100 records per row, gzip+base64
 *
 * Why this replaced sessionStorage:
 *   - 5MB / tab-scoped: it silently truncated large stores and broke the
 *     export screen when opened in a new tab.
 *   - The browser had to re-upload every record to export it; now the export
 *     pipeline seeds its batches straight from the snapshot.
 *   - Repeat request cost drops to a single SELECT for the whole TTL window.
 *
 * This module deliberately knows nothing about export resources or artifact
 * formats, so `export-pipeline.ts` can depend on it without a cycle.
 */
import { gunzipToJson, gzipToBase64 } from "./compression";
import pool from "./db";

/** Records per snapshot page. Bounds every read and every write. */
export const SNAPSHOT_PAGE_SIZE = 100;

/** How long a snapshot stays servable before it is refetched. */
export const SNAPSHOT_TTL_HOURS = 24;

/**
 * Pages scanned by a server-side search before reporting a partial result.
 * Caps worst-case work at ~2000 decompressed records.
 */
export const SNAPSHOT_SEARCH_SCAN_PAGES = 20;

export type SnapshotStatus = "FETCHING" | "READY" | "FAILED";

export interface SnapshotRow {
  id: string;
  user_id: string;
  project: string;
  direction: string;
  resource: string;
  status: SnapshotStatus;
  total_items: number;
  total_pages: number;
  page_size: number;
  source_host: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/* ================================ utils ================================= */

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * The fetched payload shape differs per platform proxy (bare array vs
 * `{ items }`). Normalise here so callers never branch on it.
 */
export function normalizeItems(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  const items = (payload as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? items : [];
}

/** Selection identity. Matches the `id` column the dashboard renders. */
export function itemId(item: any): string {
  return String(item?.id ?? item?.ID ?? "");
}

/* ================================ reads ================================= */

export async function findLiveSnapshot(input: {
  userId: string;
  project: string;
  direction: string;
  resource: string;
}): Promise<SnapshotRow | null> {
  const rows = await pool.query(
    `SELECT * FROM source_snapshots
      WHERE user_id = $1 AND project = $2 AND direction = $3 AND resource = $4
        AND status = 'READY' AND expires_at > NOW()`,
    [input.userId, input.project, input.direction, input.resource],
  );

  return (rows[0] as SnapshotRow) ?? null;
}

export async function getSnapshot(
  snapshotId: string,
  userId: string,
): Promise<SnapshotRow | null> {
  const rows = await pool.query(
    `SELECT * FROM source_snapshots WHERE id = $1 AND user_id = $2`,
    [snapshotId, userId],
  );

  return (rows[0] as SnapshotRow) ?? null;
}

export async function readSnapshotPage(
  snapshotId: string,
  pageNo: number,
): Promise<any[]> {
  const rows = await pool.query(
    `SELECT payload FROM source_snapshot_pages
      WHERE snapshot_id = $1 AND page_no = $2`,
    [snapshotId, pageNo],
  );

  const row = rows[0] as { payload: string } | undefined;

  return row ? gunzipToJson<any[]>(row.payload) : [];
}

/**
 * Every record id in the snapshot — powers "select all" without shipping the
 * dataset to the browser.
 */
export async function readSnapshotIds(snapshotId: string): Promise<string[]> {
  const rows = (await pool.query(
    `SELECT payload FROM source_snapshot_pages
      WHERE snapshot_id = $1 ORDER BY page_no`,
    [snapshotId],
  )) as { payload: string }[];

  return rows.flatMap((row) => gunzipToJson<any[]>(row.payload).map(itemId));
}

export interface SnapshotSearchResult {
  matches: any[];
  /** Pages actually decompressed — drives the "partial result" hint. */
  scanned: number;
  exhaustive: boolean;
}

/**
 * Server-side search over the snapshot. Scans a bounded number of pages so a
 * large store can never turn a keystroke into an unbounded read.
 */
export async function searchSnapshot(
  snapshotId: string,
  query: string,
  maxPages = SNAPSHOT_SEARCH_SCAN_PAGES,
): Promise<SnapshotSearchResult> {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return { matches: [], scanned: 0, exhaustive: true };
  }

  const pageRows = (await pool.query(
    `SELECT page_no FROM source_snapshot_pages
      WHERE snapshot_id = $1 ORDER BY page_no LIMIT $2`,
    [snapshotId, maxPages],
  )) as { page_no: number }[];

  const matches: any[] = [];

  for (const { page_no } of pageRows) {
    const items = await readSnapshotPage(snapshotId, page_no);

    for (const item of items) {
      if (JSON.stringify(item ?? {}).toLowerCase().includes(needle)) {
        matches.push(item);
      }
    }
  }

  const [{ total }] = (await pool.query(
    `SELECT COUNT(*)::int AS total FROM source_snapshot_pages WHERE snapshot_id = $1`,
    [snapshotId],
  )) as { total: number }[];

  return {
    matches,
    scanned: pageRows.length,
    exhaustive: pageRows.length >= total,
  };
}

/* ================================ writes ================================ */

async function insertPages(snapshotId: string, pages: any[][]): Promise<void> {
  // Multi-row inserts keep a 10k-record store at ~100 statements total
  // instead of one round trip per page. `written` carries the page offset
  // across groups so page numbers stay globally sequential.
  let written = 0;

  for (const group of chunk(pages, 50)) {
    const params: unknown[] = [snapshotId];
    const tuples = group.map((items, index) => {
      const base = params.length;
      params.push(
        written + index + 1,
        gzipToBase64(JSON.stringify(items)),
        items.length,
      );
      return `($1, $${base + 1}, $${base + 2}, $${base + 3})`;
    });

    await pool.query(
      `INSERT INTO source_snapshot_pages (snapshot_id, page_no, payload, item_count)
       VALUES ${tuples.join(", ")}`,
      params,
    );

    written += group.length;
  }
}

/**
 * Archives a freshly fetched resource, replacing any previous snapshot for
 * the same owner. Refresh is in-place (upsert on the unique owner index), so
 * snapshots never accumulate — at most one row per resource per project.
 */
export async function saveSnapshot(input: {
  userId: string;
  project: string;
  direction: string;
  resource: string;
  items: any[];
  sourceHost?: string | null;
}): Promise<SnapshotRow> {
  const pages = chunk(input.items, SNAPSHOT_PAGE_SIZE);

  const created = (await pool.query(
    `INSERT INTO source_snapshots
       (user_id, project, direction, resource, status, page_size, source_host,
        total_items, total_pages, error)
     VALUES ($1, $2, $3, $4, 'FETCHING', $5, $6, $7, $8, NULL)
     ON CONFLICT (user_id, project, direction, resource)
     DO UPDATE SET status = 'FETCHING',
                   page_size = EXCLUDED.page_size,
                   source_host = EXCLUDED.source_host,
                   total_items = EXCLUDED.total_items,
                   total_pages = EXCLUDED.total_pages,
                   error = NULL,
                   updated_at = NOW()
     RETURNING *`,
    [
      input.userId,
      input.project,
      input.direction,
      input.resource,
      SNAPSHOT_PAGE_SIZE,
      input.sourceHost ?? null,
      input.items.length,
      pages.length,
    ],
  )) as SnapshotRow[];

  const snapshot = created[0];

  // Old pages must go before the new ones: page numbering has changed.
  await pool.query(`DELETE FROM source_snapshot_pages WHERE snapshot_id = $1`, [
    snapshot.id,
  ]);

  await insertPages(snapshot.id, pages);

  const ready = (await pool.query(
    `UPDATE source_snapshots
        SET status = 'READY',
            total_items = $2,
            total_pages = $3,
            expires_at = NOW() + make_interval(hours => $4::int),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [snapshot.id, input.items.length, pages.length, SNAPSHOT_TTL_HOURS],
  )) as SnapshotRow[];

  return ready[0];
}

export async function failSnapshot(
  snapshotId: string,
  error: unknown,
): Promise<void> {
  await pool.query(
    `UPDATE source_snapshots
        SET status = 'FAILED', error = $2, updated_at = NOW()
      WHERE id = $1`,
    [snapshotId, error instanceof Error ? error.message : String(error)],
  );
}

/** Housekeeping — called opportunistically when a snapshot is created. */
export async function deleteExpiredSnapshots(): Promise<void> {
  await pool.query(`DELETE FROM source_snapshots WHERE expires_at < NOW()`);
}
