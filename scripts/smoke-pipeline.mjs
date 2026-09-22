/**
 * Temporary smoke test for the Phase 1 pipeline SQL touched by snapshot
 * seeding: server-derived batch counts, idempotent uploads, the guarded batch
 * claim, and the single-write finalize.
 *
 * Run: node --env-file=.env scripts/smoke-pipeline.mjs
 */
import { neon } from "@neondatabase/serverless";
import { gzipSync } from "node:zlib";

const sql = neon(process.env.DATABASE_URL);
const gz = (v) =>
  gzipSync(Buffer.from(JSON.stringify(v), "utf8")).toString("base64");

const USER = "smoke-pipeline-user";

function assert(label, condition, detail = "") {
  if (!condition) throw new Error(`FAILED: ${label} ${detail}`);
  console.log(`  ok  ${label}${detail ? ` (${detail})` : ""}`);
}

/** Mirrors src/lib/export-pipeline.ts#createPipelineJob */
async function createJob() {
  const rows = await sql.query(
    `INSERT INTO export_pipeline_jobs
       (user_id, project, direction, resource, total_items, total_batches, cfg)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [USER, "smoke.example.com", "wp_to_shopify", "products", 0, 0, null],
  );
  return rows[0];
}

/** Mirrors src/lib/export-pipeline.ts#insertJobBatch */
async function insertJobBatch(jobId, seq, records) {
  await sql.query(
    `INSERT INTO export_job_batches (job_id, seq, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (job_id, seq)
     DO UPDATE SET payload = EXCLUDED.payload, processed = FALSE`,
    [jobId, seq, gz(records)],
  );

  await sql.query(
    `WITH counts AS (
       SELECT COUNT(*)::int AS uploaded
         FROM export_job_batches
        WHERE job_id = $1
     )
     UPDATE export_pipeline_jobs j
        SET uploaded_batches = counts.uploaded,
            status = CASE
              WHEN counts.uploaded >= j.total_batches
               AND j.status = 'AWAITING_DATA' THEN 'PROCESSING'
              ELSE j.status
            END,
            updated_at = NOW()
       FROM counts
      WHERE j.id = $1`,
    [jobId],
  );
}

/** Mirrors src/lib/export-pipeline.ts#seedJobBatchesFromSnapshot finalize */
async function finalizeSeeding(jobId, totalItems, totalBatches) {
  await sql.query(
    `UPDATE export_pipeline_jobs
        SET total_items = $2,
            total_batches = $3,
            uploaded_batches = $3,
            status = CASE WHEN $3 > 0 THEN 'PROCESSING' ELSE 'FAILED' END,
            error = CASE WHEN $3 > 0 THEN NULL
                         ELSE 'No records matched the selection' END,
            updated_at = NOW()
      WHERE id = $1`,
    [jobId, totalItems, totalBatches],
  );
}

async function job(jobId) {
  return (
    await sql.query(`SELECT * FROM export_pipeline_jobs WHERE id = $1`, [jobId])
  )[0];
}

async function main() {
  await sql.query(`DELETE FROM export_pipeline_jobs WHERE user_id = $1`, [USER]);

  console.log("1. server-derived seeding finalize (no client counts trusted)");
  const seeded = await createJob();
  await finalizeSeeding(seeded.id, 420, 3);
  const afterSeed = await job(seeded.id);
  assert("status PROCESSING", afterSeed.status === "PROCESSING", afterSeed.status);
  assert(
    "counts written",
    afterSeed.total_items === 420 && afterSeed.total_batches === 3,
    `${afterSeed.total_items}/${afterSeed.total_batches}`,
  );
  assert("uploaded advanced", afterSeed.uploaded_batches === 3, String(afterSeed.uploaded_batches));
  assert("error cleared", afterSeed.error === null);

  console.log("2. empty selection fails with a useful message");
  const empty = await createJob();
  await finalizeSeeding(empty.id, 0, 0);
  const afterEmpty = await job(empty.id);
  assert("status FAILED", afterEmpty.status === "FAILED", afterEmpty.status);
  assert(
    "error explains why",
    afterEmpty.error === "No records matched the selection",
    afterEmpty.error,
  );
  assert("no batches", afterEmpty.total_batches === 0);

  console.log("3. legacy upload path still works (idempotent, no double count)");
  const legacy = await createJob();
  await sql.query(`UPDATE export_pipeline_jobs SET total_batches = 3 WHERE id = $1`, [legacy.id]);

  await insertJobBatch(legacy.id, 1, [{ id: 1 }]);
  let state = await job(legacy.id);
  assert("uploaded 1/3", state.uploaded_batches === 1, String(state.uploaded_batches));
  assert("still AWAITING_DATA", state.status === "AWAITING_DATA", state.status);

  await insertJobBatch(legacy.id, 1, [{ id: 1 }, { id: 2 }]);
  state = await job(legacy.id);
  assert(
    "retry did not double-count",
    state.uploaded_batches === 1,
    String(state.uploaded_batches),
  );

  await insertJobBatch(legacy.id, 2, [{ id: 3 }]);
  await insertJobBatch(legacy.id, 3, [{ id: 4 }]);
  state = await job(legacy.id);
  assert("flips to PROCESSING at 3/3", state.status === "PROCESSING", state.status);
  assert("uploaded 3/3", state.uploaded_batches === 3, String(state.uploaded_batches));

  console.log("4. guarded claim: each batch claimed exactly once");
  const claims = new Set();
  for (let i = 0; i < 4; i++) {
    const rows = await sql.query(
      `UPDATE export_job_batches
          SET processed = TRUE
        WHERE job_id = $1
          AND seq = (
            SELECT seq FROM export_job_batches
             WHERE job_id = $1 AND processed = FALSE
             ORDER BY seq LIMIT 1
          )
          AND processed = FALSE
        RETURNING seq`,
      [legacy.id],
    );
    if (rows[0]) claims.add(rows[0].seq);
  }
  assert("3 distinct claims then none", claims.size === 3, `seqs=${[...claims].join(",")}`);

  console.log("5. cascade delete removes batches and parts");
  await sql.query(
    `INSERT INTO export_job_parts (job_id, part_number, filename, content, size_bytes)
     VALUES ($1, 1, 'products-import-part1.csv', $2, 10)
     ON CONFLICT (job_id, part_number) DO UPDATE SET content = EXCLUDED.content`,
    [legacy.id, gz([{ id: 1 }])],
  );
  await sql.query(`DELETE FROM export_pipeline_jobs WHERE id = $1`, [legacy.id]);
  const leftovers = await sql.query(
    `SELECT
       (SELECT COUNT(*)::int FROM export_job_batches WHERE job_id = $1) AS batches,
       (SELECT COUNT(*)::int FROM export_job_parts   WHERE job_id = $1) AS parts`,
    [legacy.id],
  );
  assert("batches cascaded", leftovers[0].batches === 0, String(leftovers[0].batches));
  assert("parts cascaded", leftovers[0].parts === 0, String(leftovers[0].parts));

  await sql.query(`DELETE FROM export_pipeline_jobs WHERE user_id = $1`, [USER]);
  console.log("\nAll pipeline smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
