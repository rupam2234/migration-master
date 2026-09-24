/**
 * Scheduled retention cleanup.
 *
 * Runs in bounded batches so a large backlog cannot turn one cleanup into a
 * long database transaction. GitHub Actions supplies DATABASE_URL as a secret.
 *
 * Policy:
 *   - snapshots: expired or stale FETCHING rows
 *   - READY/FAILED jobs: older than 7 days
 *   - QUEUED/PAID/PROCESSING jobs: never deleted
 *   - ownership, payments, and credit ledger: never deleted here
 */
import { neon } from "@neondatabase/serverless";

const SNAPSHOT_BATCH_SIZE = 25;
const JOB_BATCH_SIZE = 10;
const SNAPSHOT_STALE_MINUTES = 15;
const JOB_RETENTION_DAYS = 7;

async function deleteBatch(sqlText, params, label) {
  const rows = await sql.query(sqlText, params);
  const count = rows?.length ?? 0;
  console.log(`${label}: ${count}`);
  return count;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = neon(process.env.DATABASE_URL);
  let totalSnapshots = 0;
  let totalJobs = 0;
  let deleted = 0;

  do {
    deleted = await deleteBatch(
      `WITH victims AS (
         SELECT id
         FROM source_snapshots
         WHERE expires_at < NOW()
            OR (status = 'FETCHING' AND updated_at < NOW() - ($1 || ' minutes')::interval)
         ORDER BY expires_at
         LIMIT $2
       )
       DELETE FROM source_snapshots s
       USING victims
       WHERE s.id = victims.id
       RETURNING s.id`,
      [SNAPSHOT_STALE_MINUTES, SNAPSHOT_BATCH_SIZE],
      "snapshots deleted",
    );
    totalSnapshots += deleted;
  } while (deleted === SNAPSHOT_BATCH_SIZE);

  do {
    deleted = await deleteBatch(
      `WITH victims AS (
         SELECT id
         FROM export_pipeline_jobs
         WHERE status IN ('READY', 'FAILED')
           AND updated_at < NOW() - ($1 || ' days')::interval
         ORDER BY updated_at
         LIMIT $2
       )
       DELETE FROM export_pipeline_jobs j
       USING victims
       WHERE j.id = victims.id
       RETURNING j.id`,
      [JOB_RETENTION_DAYS, JOB_BATCH_SIZE],
      "export jobs deleted",
    );
    totalJobs += deleted;
  } while (deleted === JOB_BATCH_SIZE);

  console.log(`Cleanup complete: ${totalSnapshots} snapshots, ${totalJobs} jobs.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
