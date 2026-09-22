/**
 * Temporary smoke test for the snapshot data layer.
 *
 * Exercises the exact SQL the app issues: multi-row page inserts (parameter
 * numbering + page offset across groups), owner upsert + page replacement,
 * TTL gating, cascade delete.
 * Run: node --env-file=.env scripts/smoke-snapshots.mjs
 */
import { neon } from "@neondatabase/serverless";
import { gzipSync, gunzipSync } from "node:zlib";

const sql = neon(process.env.DATABASE_URL);

const USER = "smoke-test-user";
const PROJECT = "smoke.example.com";
const DIRECTION = "wp_to_shopify";
const RESOURCE = "products";
const PAGE_SIZE = 100;
/** Must match `insertPages`'s group size. */
const INSERT_GROUP_SIZE = 50;

const gz = (v) =>
  gzipSync(Buffer.from(JSON.stringify(v), "utf8")).toString("base64");
const ungz = (p) =>
  JSON.parse(gunzipSync(Buffer.from(p, "base64")).toString("utf8"));

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Mirrors src/lib/snapshots.ts#insertPages */
async function insertPages(snapshotId, pages) {
  let written = 0;

  for (const group of chunk(pages, INSERT_GROUP_SIZE)) {
    const params = [snapshotId];
    const tuples = group.map((items, index) => {
      const base = params.length;
      params.push(written + index + 1, gz(items), items.length);
      return `($1, $${base + 1}, $${base + 2}, $${base + 3})`;
    });

    await sql.query(
      `INSERT INTO source_snapshot_pages (snapshot_id, page_no, payload, item_count)
       VALUES ${tuples.join(", ")}`,
      params,
    );

    written += group.length;
  }
}

/** Mirrors src/lib/snapshots.ts#saveSnapshot */
async function saveSnapshot(items) {
  const pages = chunk(items, PAGE_SIZE);

  const created = await sql.query(
    `INSERT INTO source_snapshots
       (user_id, project, direction, resource, status, page_size, source_host,
        total_items, total_pages, error)
     VALUES ($1, $2, $3, $4, 'FETCHING', $5, $6, $7, $8, NULL)
     ON CONFLICT (user_id, project, direction, resource)
     DO UPDATE SET status = 'FETCHING', total_items = EXCLUDED.total_items,
                   total_pages = EXCLUDED.total_pages, error = NULL,
                   updated_at = NOW()
     RETURNING *`,
    [
      USER,
      PROJECT,
      DIRECTION,
      RESOURCE,
      PAGE_SIZE,
      PROJECT,
      items.length,
      pages.length,
    ],
  );

  const snapshot = created[0];
  await sql.query(`DELETE FROM source_snapshot_pages WHERE snapshot_id = $1`, [
    snapshot.id,
  ]);
  await insertPages(snapshot.id, pages);

  const ready = await sql.query(
    `UPDATE source_snapshots
        SET status = 'READY', total_items = $2, total_pages = $3,
            expires_at = NOW() + make_interval(hours => $4::int), updated_at = NOW()
      WHERE id = $1 RETURNING *`,
    [snapshot.id, items.length, pages.length, 24],
  );

  return ready[0];
}

function assert(label, condition, detail = "") {
  if (!condition) throw new Error(`FAILED: ${label} ${detail}`);
  console.log(`  ok  ${label}${detail ? ` (${detail})` : ""}`);
}

async function main() {
  const cleanup = async () => {
    await sql.query(`DELETE FROM source_snapshots WHERE user_id = $1`, [USER]);
  };

  await cleanup();

  console.log("1. insert 250 records (3 pages, grouped multi-row insert)");
  const items = Array.from({ length: 250 }, (_, i) => ({
    id: 1000 + i,
    title: `Product ${i}`,
    price: (i / 100).toFixed(2),
  }));

  const snap = await saveSnapshot(items);
  assert("status READY", snap.status === "READY", snap.status);
  assert("total_items", snap.total_items === 250, String(snap.total_items));
  assert("total_pages", snap.total_pages === 3, String(snap.total_pages));
  assert("ttl set", new Date(snap.expires_at).getTime() > Date.now());

  const pages = await sql.query(
    `SELECT page_no, item_count FROM source_snapshot_pages
      WHERE snapshot_id = $1 ORDER BY page_no`,
    [snap.id],
  );
  assert("3 page rows", pages.length === 3, `count=${pages.length}`);
  assert(
    "page sizes 100/100/50",
    pages.map((p) => p.item_count).join(",") === "100,100,50",
    pages.map((p) => p.item_count).join(","),
  );

  console.log("2. round-trip a page payload");
  const page1 = await sql.query(
    `SELECT payload FROM source_snapshot_pages WHERE snapshot_id = $1 AND page_no = 1`,
    [snap.id],
  );
  const decoded = ungz(page1[0].payload);
  assert("decoded length", decoded.length === 100, String(decoded.length));
  assert("first record intact", decoded[0].title === "Product 0", decoded[0].title);
  assert(
    "compressed smaller",
    page1[0].payload.length < JSON.stringify(decoded).length,
    `${page1[0].payload.length} < ${JSON.stringify(decoded).length}`,
  );

  console.log("3. refresh in place (upsert + page replacement)");
  const refreshed = await saveSnapshot(items.slice(0, 120));
  assert("same row reused", refreshed.id === snap.id, "id stable");

  const afterPages = await sql.query(
    `SELECT COUNT(*)::int AS n FROM source_snapshot_pages WHERE snapshot_id = $1`,
    [snap.id],
  );
  assert("pages replaced (2)", afterPages[0].n === 2, String(afterPages[0].n));

  const stale = await sql.query(
    `SELECT COUNT(*)::int AS n FROM source_snapshot_pages
      WHERE snapshot_id = $1 AND page_no > 2`,
    [snap.id],
  );
  assert("no stale pages", stale[0].n === 0, String(stale[0].n));

  console.log("4. expiry gate (findLiveSnapshot predicate)");
  const live = await sql.query(
    `SELECT id FROM source_snapshots
      WHERE user_id = $1 AND project = $2 AND direction = $3 AND resource = $4
        AND status = 'READY' AND expires_at > NOW()`,
    [USER, PROJECT, DIRECTION, RESOURCE],
  );
  assert("live snapshot found", live.length === 1);

  await sql.query(
    `UPDATE source_snapshots SET expires_at = NOW() - INTERVAL '1 hour' WHERE id = $1`,
    [snap.id],
  );
  const expired = await sql.query(
    `SELECT id FROM source_snapshots
      WHERE user_id = $1 AND status = 'READY' AND expires_at > NOW()`,
    [USER],
  );
  assert("expired snapshot excluded", expired.length === 0);

  console.log("5. TTL housekeeping + cascade delete");
  await sql.query(`DELETE FROM source_snapshots WHERE expires_at < NOW()`);
  const orphans = await sql.query(
    `SELECT COUNT(*)::int AS n FROM source_snapshot_pages WHERE snapshot_id = $1`,
    [snap.id],
  );
  assert("pages cascaded away", orphans[0].n === 0, String(orphans[0].n));

  console.log("6. >50 pages: page numbering must be sequential across groups");
  const many = Array.from({ length: 5100 }, (_, i) => ({
    id: 2000 + i,
    title: `Bulk ${i}`,
  }));

  const bulk = await saveSnapshot(many);
  assert("total_pages 51", bulk.total_pages === 51, String(bulk.total_pages));

  const pageNumbers = await sql.query(
    `SELECT page_no FROM source_snapshot_pages
      WHERE snapshot_id = $1 ORDER BY page_no`,
    [bulk.id],
  );
  const seq = pageNumbers.map((p) => p.page_no).join(",");
  const expected = Array.from({ length: 51 }, (_, i) => i + 1).join(",");
  assert("page_no 1..51 contiguous", seq === expected, seq);

  const lastPage = await sql.query(
    `SELECT payload FROM source_snapshot_pages
      WHERE snapshot_id = $1 ORDER BY page_no DESC LIMIT 1`,
    [bulk.id],
  );
  const tail = ungz(lastPage[0].payload);
  assert("last page holds the true tail", tail[0].title === "Bulk 5000", tail[0].title);

  await cleanup();
  console.log("\nAll snapshot smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
