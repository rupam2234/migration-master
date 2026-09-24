/**
 * Server-side export pipeline (Phase 1).
 *
 * Replaces in-browser JSZip over the whole dataset with a batched, resumable
 * job model. Source records live in a server-side snapshot (Neon) and the
 * browser only ever sends selection Ids and holds analysis/preview data.
 *
 * Artifacts are written per-batch (WXR for WordPress, CSV for Shopify),
 * gzip-compressed and stored as base64 text so they survive the Wire without
 * extra casting — the same convention used by `source_snapshot_pages`.
 *
 * Compression helpers live in `compression.ts`:
 *   export-pipeline.ts imports from "compression" so the only place to change
 *   when artifacts move to object storage (R2/S3) is that one module.
 */
import { gzipToBase64, gunzipToJson, gunzipToString } from "./compression";
import pool from "./db";
import { getSnapshot, itemId, readSnapshotPage } from "./snapshots";
import { generateWXR, type WXRConfig } from "./wxr_generator";
import { generateShopifyCsv } from "./shopify-csv";
import type { ShopifyResources, WordPressResource } from "./sharedResources";
import { hasSufficientCredits, deductCreditsForExport } from "./payment-utils";

/** Single batch size for uploads + transforms. One job process call = one batch. */
export const PIPELINE_BATCH_SIZE = 150;

export type ExportDirection = "shopify_to_wp" | "wp_to_shopify";

export type PipelineStatus =
  | "PROCESSING"
  | "QUEUED"
  | "READY"
  | "FAILED"
  | "PAID";

/** One export job. Persisted in Neon. */
export interface PipelineJobRow {
  id: string;
  user_id: string;
  project: string;
  direction: ExportDirection;
  resource: string;
  resource_label: string | null;
  status: PipelineStatus;
  total_items: number;
  total_batches: number;
  uploaded_batches: number;
  processed_batches: number;
  part_count: number;
  current_batch_seq: number | null;
  cfg: WXRConfig | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** The payload the export screen posts. The value is the bullet list of what the job does. */
export interface CreatePipelineJobInput {
  userId: string;
  project: string;
  direction: ExportDirection;
  resource: string;
  resource_label: string | null;
  totalItems: number;
  totalBatches: number;
  cfg?: WXRConfig | null;
  snapshotId?: string | null;
  initialStatus?: "PROCESSING" | "QUEUED";
}

/** What to seed from a snapshot: every record, or an explicit id list. */
export type SnapshotSelection = "all" | { ids: string[] };

/* ============================ compression ============================ */

export function compressRecords(records: unknown[]): string {
  return gzipToBase64(JSON.stringify(records));
}

export function decompressRecords<T = any>(payload: string): T[] {
  return gunzipToJson<T[]>(payload);
}

function compressArtifact(content: string): string {
  return gzipToBase64(content);
}

export function decompressArtifact(content: string): string {
  return gunzipToString(content);
}

/* ============================ job creation ============================ */

export async function getActiveExportJob(input: {
  userId: string;
  project: string;
  direction: ExportDirection;
  resource: string;
}): Promise<PipelineJobRow | null> {
  const rows = await pool.query(
    `SELECT * FROM export_pipeline_jobs
     WHERE user_id = $1 AND project = $2 AND direction = $3 AND resource = $4
       AND status IN ('QUEUED', 'PAID', 'PROCESSING')
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.userId, input.project, input.direction, input.resource],
  );
  return (rows[0] as PipelineJobRow) ?? null;
}

export async function activateExportJob(
  jobId: string,
  maxActiveJobs = 3,
): Promise<boolean> {
  const rows = await pool.query(
    `UPDATE export_pipeline_jobs
     SET status = 'PROCESSING', updated_at = NOW()
     WHERE id = $1
       AND status IN ('QUEUED', 'PAID')
       AND (SELECT COUNT(*) FROM export_pipeline_jobs WHERE status = 'PROCESSING') < $2
     RETURNING id`,
    [jobId, maxActiveJobs],
  );
  return rows.length > 0;
}

export async function createPipelineJob(
  input: CreatePipelineJobInput,
): Promise<PipelineJobRow> {
  const rows = await pool.query(
    `INSERT INTO export_pipeline_jobs
       (user_id, project, direction, resource, resource_label, status,
        total_items, total_batches, current_batch_seq, cfg, snapshot_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL,
             $9::jsonb, $10)
     RETURNING *`,
    [
      input.userId,
      input.project,
      input.direction,
      input.resource,
      input.resource_label,
      input.initialStatus ?? "PROCESSING",
       input.totalItems,
      input.totalBatches,
      input.cfg ? JSON.stringify(input.cfg) : null,
      input.snapshotId ?? null,
    ],
  );

  return (rows[0] as PipelineJobRow) || ({} as PipelineJobRow);
}

export async function getPipelineJob(
  jobId: string,
  userId: string,
): Promise<PipelineJobRow | null> {
  const rows = await pool.query(
    `SELECT * FROM export_pipeline_jobs
     WHERE id = $1 AND user_id = $2`,
    [jobId, userId],
  );

  return (rows[0] as PipelineJobRow) ?? null;
}

export async function insertJobBatch(
  jobId: string,
  seq: number,
  records: unknown[],
): Promise<void> {
  await pool.query(
    `INSERT INTO export_job_batches (job_id, seq, payload, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [jobId, seq, compressRecords(records)],
  );

  await pool.query(
    `UPDATE export_pipeline_jobs
     SET uploaded_batches = uploaded_batches + 1,
         status = CASE
           WHEN uploaded_batches + 1 >= total_batches THEN 'PROCESSING'
           ELSE status END,
         updated_at = NOW()
     WHERE id = $1`,
    [jobId],
  );
}

/**
 * Insert used by the snapshot seeding path. Unlike `insertJobBatch` it does
 * not touch the job row — seeding records progress once at the end, so a
 * 10k-record job costs 1 job UPDATE instead of one per batch.
 */
async function insertBatchRaw(
  jobId: string,
  seq: number,
  records: unknown[],
): Promise<void> {
  await pool.query(
    `INSERT INTO export_job_batches (job_id, seq, payload, created_at, processed, processed_at)
     VALUES ($1, $2, $3, NOW(), FALSE, NULL)
     ON CONFLICT (job_id, seq)
     DO UPDATE SET payload = EXCLUDED.payload,
                  processed = FALSE,
                  processed_at = NULL`,
    [jobId, seq, compressRecords(records)],
  );
}

/**
 * Atomically claims the next unprocessed batch. The guarded
 * `AND processed = FALSE` in the outer UPDATE makes concurrent callers safe:
 * only one of them gets a row back.
 */
export async function claimNextBatch(
  jobId: string,
): Promise<{ seq: number; records: any[] } | null> {
  const rows = await pool.query(
    `UPDATE export_job_batches
     SET processed = TRUE, processed_at = NOW()
     WHERE job_id = $1
       AND seq = (
         SELECT seq FROM export_job_batches
         WHERE job_id = $1 AND processed = FALSE
         ORDER BY seq
         LIMIT 1
       )
       AND processed = FALSE
     RETURNING seq, payload`,
    [jobId],
  );

  const row = rows[0] as { seq: number; payload: string } | undefined;

  if (!row) return null;

  return { seq: row.seq, records: decompressRecords(row.payload) };
}

/** One artifact file per batch, named like the legacy export flow. */
function artifactFilename(
  direction: ExportDirection,
  resource: string,
  seq: number,
): string {
  return direction === "shopify_to_wp"
    ? `${resource}-wordpress-import-part${seq}.xml`
    : `${resource}-shopify-import-part${seq}.csv`;
}

function transformBatch(
  direction: ExportDirection,
  resource: string,
  items: any[],
  cfg: WXRConfig | null,
): string {
  if (direction === "shopify_to_wp") {
    return generateWXR(
      resource as ShopifyResources,
      items,
      cfg ?? { siteUrl: "", defaultAuthor: "admin" },
    );
  }

  return generateShopifyCSV(resource as WordPressResource, items);
}

/** Record ownership for one bounded export batch. Retries are idempotent. */
async function claimBatchOwnership(
  job: PipelineJobRow,
  records: any[],
): Promise<void> {
  const itemIds = Array.from(
    new Set(records.map((record) => itemId(record).trim()).filter(Boolean)),
  );
  if (itemIds.length === 0) return;

  await pool.query(
    `INSERT INTO exported_item_ownership
      (user_id, project, direction, resource, item_id, first_job_id)
     SELECT $1, $2, $3, $4, item_id, $5
     FROM UNNEST($6::text[]) AS item_id
     ON CONFLICT (user_id, project, direction, resource, item_id) DO NOTHING`,
    [job.user_id, job.project, job.direction, job.resource, job.id, itemIds],
  );
}

/** Transform a claimed batch and persist its artifact and ownership. */
export async function processBatch(
  job: PipelineJobRow,
  batch: { seq: number; records: any[] },
): Promise<void> {
  const content = transformBatch(
    job.direction,
    job.resource,
    batch.records,
    job.cfg,
  );

  const compressed = compressArtifact(content);

  await pool.query(
    `INSERT INTO export_job_parts (job_id, part_number, filename, content, size_bytes, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [
      job.id,
      batch.seq,
      artifactFilename(job.direction, job.resource, batch.seq),
      compressed,
      Buffer.byteLength(compressed, "utf8"),
    ],
  );

  await claimBatchOwnership(job, batch.records);

  await pool.query(
    `UPDATE export_pipeline_jobs
     SET processed_batches = processed_batches + 1,
          part_count = part_count + 1,
         current_batch_seq = $2,
         status = CASE WHEN processed_batches + 1 >= total_batches THEN status ELSE 'PROCESSING' END,
         updated_at = NOW()
     WHERE id = $1`,
    [job.id, batch.seq],
  );
}


export async function getOwnedItemIds(input: {
  userId: string;
  project: string;
  direction: ExportDirection;
  resource: string;
  itemIds: string[];
}): Promise<Set<string>> {
  if (input.itemIds.length === 0) return new Set();

  const owned = new Set<string>();
  const chunkSize = 1_000;
  for (let start = 0; start < input.itemIds.length; start += chunkSize) {
    const chunk = input.itemIds.slice(start, start + chunkSize);
    const rows = await pool.query(
      `SELECT item_id FROM exported_item_ownership
       WHERE user_id = $1 AND project = $2 AND direction = $3 AND resource = $4
         AND item_id = ANY($5::text[])`,
      [input.userId, input.project, input.direction, input.resource, chunk],
    );
    for (const row of rows) owned.add(String(row.item_id));
  }
  return owned;
}

/** Mark the job READY when all parts arrived, so the client can download. */
export async function finalizeIfComplete(
  jobId: string,
): Promise<PipelineJobRow | null> {
  const current = await getPipelineJobById(jobId);
  if (!current) return null;
  if (current.status !== "READY" && current.processed_batches >= current.total_batches && current.total_batches > 0) {
    await pool.query(
      `UPDATE export_pipeline_jobs
        SET status = 'READY', updated_at = NOW()
        WHERE id = $1 AND status <> 'READY'`,
      [jobId],
    );
  }

  return getPipelineJobById(jobId);
}

async function getPipelineJobById(jobId: string): Promise<PipelineJobRow | null> {
  const rows = await pool.query(
    `SELECT * FROM export_pipeline_jobs WHERE id = $1`,
    [jobId],
  );
  return (rows[0] as PipelineJobRow) ?? null;
}

/** Record a failing job with a message. */
export async function failPipelineJob(jobId: string, error: unknown): Promise<void> {
  await pool.query(
    `UPDATE export_pipeline_jobs
     SET status = 'FAILED',
         error = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, error instanceof Error ? error.message : String(error)],
  );
}

/**
 * Returns a single artifact part row by job + part number.
 * Used by the parts download route to stream a per-batch file to the
 * browser.
 */
export async function getJobPart(
  jobId: string,
  partNumber: number,
): Promise<{ filename: string; content: string } | null> {
  const rows = await pool.query(
    `SELECT filename, content FROM export_job_parts
     WHERE job_id = $1 AND part_number = $2`,
    [jobId, partNumber],
  );

  const row = rows[0] as { filename: string; content: string } | undefined;
  return row ?? null;
}



/* ==================================================================
 * Resource config + CSV generation helpers.
 * ================================================================== */

const SHOPIFY_TO_WP_RESOURCES: ShopifyResources[] = [
  "products",
  "images",
  "articles",
  "pages",
  "customers",
  "orders",
];

const WP_TO_SHOPIFY_RESOURCES: WordPressResource[] = [
  "products",
  "posts",
  "categories",
];

/**
 * Returns true only for resources the export pipeline knows how to transform.
 * Keeps the /api/export-jobs creation endpoint honest about what it will
 * accept.
 */
export function isSupportedExportResource(
  direction: ExportDirection,
  resource: string,
): boolean {
  return direction === "shopify_to_wp"
    ? SHOPIFY_TO_WP_RESOURCES.includes(resource as ShopifyResources)
    : WP_TO_SHOPIFY_RESOURCES.includes(resource as WordPressResource);
}

/**
 * Generates a Shopify import CSV from a page of WordPress records.
 *
 * Delegates to the per-resource mappers in `@/lib/shopify-csv`, which map
 * records onto Shopify's architecture:
 * - products → native product CSV (incl. `Metafield:` columns and tags)
 * - posts → blog-post CSV (Matrixify-compatible)
 * - categories → collections CSV (Matrixify-compatible)
 */
export function generateShopifyCSV(
  resource: WordPressResource,
  items: any[],
): string {
  return generateShopifyCsv(resource, items);
}


/**
 * Seeds a job's source batches directly from a snapshot, so the browser no
 * longer uploads records.
 *
 * Pages are streamed into a rolling buffer that is flushed as soon as a full
 * batch is available, keeping peak memory at roughly one batch regardless of
 * how large the store is. Re-running is safe: batch inserts are keyed on
 * (job_id, seq) and reset `processed`.
 *
 * @returns the number of selected records and batches written
 */
export async function seedJobBatchesFromSnapshot(
  input: {
    jobId: string;
    userId: string;
    snapshotId: string;
    selection: SnapshotSelection;
  },
): Promise<{ totalItems: number; totalBatches: number }> {
  const snapshot = await getSnapshot(input.snapshotId, input.userId);

  if (!snapshot) {
    throw new Error("Snapshot not found");
  }

  if (snapshot.status !== "READY") {
    throw new Error(`Snapshot is not ready (status: ${snapshot.status})`);
  }

  const selectAll = input.selection === "all";

  // `input.selection` is `"all" | { ids: string[] }`. When it's not "all",
  // it must be the ids object — narrow with a guard so TypeScript sees it.
  const wanted =
    selectAll || typeof input.selection !== "object"
      ? null
      : new Set(input.selection.ids);

  let buffer: any[] = [];
  let batchSeq = 0;
  let totalItems = 0;

  const flush = async () => {
    batchSeq += 1;
    await insertBatchRaw(input.jobId, batchSeq, buffer);
    buffer = [];
  };

  for (let pageNo = 1; pageNo <= snapshot.total_pages; pageNo++) {
    const items = await readSnapshotPage(snapshot.id, pageNo);

    for (const item of items) {
      if (wanted !== null && !wanted.has(itemId(item))) continue;

      buffer.push(item);
      totalItems += 1;

      if (buffer.length === PIPELINE_BATCH_SIZE) await flush();
    }
  }

  if (buffer.length > 0) await flush();

  const totalBatches = batchSeq;

  // Single write for all batches — with zero matches the job fails with a
  // useful message instead of sitting in AWAITING_DATA forever.
  await pool.query(
    `UPDATE export_pipeline_jobs
     SET total_items = $2,
         total_batches = $3,
         uploaded_batches = $3,
         status = CASE
           WHEN status IN ('QUEUED', 'PAID') THEN status
           WHEN $3 > 0 THEN 'PROCESSING'
           ELSE 'FAILED'
         END,
         error = CASE WHEN $3 > 0 THEN NULL
                      ELSE 'No records matched the selection' END,
         updated_at = NOW()
     WHERE id = $1`,
    [input.jobId, totalItems, totalBatches],
  );

  return { totalItems, totalBatches };
}

/**
 * Creates a new export job AND seeds its source batches from the snapshot in
 * one atomic server operation. The export screen calls this right after payment
 * clears (or when everything is already owned).
 *
 * This is `CreateSnapshotAndJob` from the plan: it takes the snapshot id from
 * the page state (precedence class 4.1) and pulls every source record out of
 * the server-side archive instead of asking the browser to upload them.
 */
export async function CreateSnapshotAndJob(input: {
  userId: string;
  project: string;
  direction: ExportDirection;
  resource: string;
  resourceLabel: string | null;
  snapshotId: string;
  selection: SnapshotSelection;
}): Promise<{ jobId: string; totalItems: number; totalBatches: number }> {
  const job = await createPipelineJob({
    userId: input.userId,
    project: input.project,
    direction: input.direction,
    resource: input.resource,
    resource_label: input.resourceLabel,
    totalItems: 0,
    totalBatches: 0,
    cfg: null,
    snapshotId: input.snapshotId,
  });

  const { totalItems, totalBatches } = await seedJobBatchesFromSnapshot({
    jobId: job.id,
    userId: input.userId,
    snapshotId: input.snapshotId,
    selection: input.selection,
  });

  // Edge case: re-export of zero selected records (allOwned with an empty
  // selection) should not crash in `runExportPipeline` / process calls —
  // the job already FAILs with a helpful message from the seeding call.
  if (totalBatches === 0) {
    return { jobId: job.id, totalItems: 0, totalBatches: 0 };
  }

  return { jobId: job.id, totalItems, totalBatches };
}

/* ============================ credit-based export ============================ */

export async function createPaidExportJob(input: {
  userId: string;
  project: string;
  direction: ExportDirection;
  resource: string;
  resourceLabel: string | null;
  snapshotId: string;
  selection: SnapshotSelection;
  requiredCredits: number;
  paymentTransactionId?: string;
}): Promise<{ jobId: string; totalItems: number; totalBatches: number }> {
  const { userId, project, direction, resource, snapshotId, selection, paymentTransactionId } = input;
  const snapshot = await getSnapshot(snapshotId, userId);
  if (!snapshot || snapshot.status !== "READY") {
    throw new Error("A ready snapshot is required to calculate export credits");
  }

  const selectedIds: string[] = [];
  if (selection === "all") {
    for (let pageNo = 1; pageNo <= snapshot.total_pages; pageNo++) {
      const records = await readSnapshotPage(snapshot.id, pageNo);
      for (const record of records) {
        const id = itemId(record).trim();
        if (id) selectedIds.push(id);
      }
    }
  } else {
    for (const id of selection.ids) {
      const normalized = id.trim();
      if (normalized) selectedIds.push(normalized);
    }
  }

  const ownedIds = await getOwnedItemIds({
    userId,
    project,
    direction,
    resource,
    itemIds: selectedIds,
  });
  const billableCredits = selectedIds.filter((id) => !ownedIds.has(id)).length;

  if (billableCredits > 0) {
    const creditCheck = await hasSufficientCredits(userId, billableCredits);
    if (!creditCheck.hasEnough) {
      throw new Error(`Insufficient credits. Required: ${billableCredits}, Available: ${creditCheck.currentBalance}`);
    }
  }

  const job = await createPipelineJob({
    userId: input.userId,
    project: input.project,
    direction: input.direction,
    resource: input.resource,
    resource_label: input.resourceLabel,
    totalItems: 0,
    totalBatches: 0,
    cfg: null,
    snapshotId: input.snapshotId,
    initialStatus: "QUEUED",
  });

  // Seed the job from snapshot
  const { totalItems, totalBatches } = await seedJobBatchesFromSnapshot({
    jobId: job.id,
    userId: input.userId,
    snapshotId: input.snapshotId,
    selection: input.selection,
  });

  if (totalBatches === 0) {
    throw new Error('No records matched the selection');
  }

  if (billableCredits > 0) {
    const { success } = await deductCreditsForExport(
      userId,
      job.id,
      billableCredits
    );

    if (!success) {
      throw new Error('Failed to deduct credits');
    }
  }

  // Attach the verified payment transaction and its coupon metadata. Only a
  // completed transaction owned by this user may be attached.
  if (paymentTransactionId) {
    await pool.query(
      `UPDATE export_pipeline_jobs j
       SET payment_transaction_id = pt.id,
           coupon_code = pt.coupon_code,
           coupon_percent = c.discount_percent
       FROM payment_transactions pt
       LEFT JOIN credit_coupons c ON c.id = pt.coupon_id
       WHERE j.id = $1
         AND pt.id = $2
         AND pt.user_id = $3
         AND pt.status = 'COMPLETED'`,
      [job.id, paymentTransactionId, userId],
    );
  }

  // Update job status to QUEUED
  await pool.query(
    `UPDATE export_pipeline_jobs
     SET status = 'QUEUED', updated_at = NOW()
     WHERE id = $1`,
    [job.id]
  );

  return { jobId: job.id, totalItems, totalBatches };
}

