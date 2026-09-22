/**
 * Single source of truth for the export "[resources]" screen.
 *
 * Previously these values were inlined in the page component. They live here
 * so every hook and presentational component below shares one definition
 * without drifting apart.
 */

export const EXPORT_PAGE_SIZE = 11;

/** Max characters shown per table cell before truncation (full value in title attr). */
export const CELL_TRUNCATE_LENGTH = 60;

/** Records per upload/processing batch — must match the server. */
export const PIPELINE_BATCH_SIZE = 150;

/** Records per snapshot page — must match `SNAPSHOT_PAGE_SIZE` server-side. */
export const SNAPSHOT_PAGE_SIZE = 100;

/**
 * Rows the browser keeps for browsing/selecting. The server holds the full
 * store; the table only needs a working set, so this cap keeps a 50k-record
 * resource from becoming 50k React rows.
 */
export const LOCAL_ROW_LIMIT = 1000;

/** Bounded snapshot-page fan-out — instant feel, polite to the API. */
export const PAGE_FETCH_CONCURRENCY = 5;

export type ExportDirection = "shopify_to_wp" | "wp_to_shopify";

export type PipelineState = {
  phase: "idle" | "uploading" | "processing" | "downloading" | "error";
  uploaded: number;
  totalBatches: number;
  processed: number;
  error: string | null;
};

export const IDLE_PIPELINE: PipelineState = {
  phase: "idle",
  uploaded: 0,
  totalBatches: 0,
  processed: 0,
  error: null,
};

export type SnapshotMeta = {
  id: string;
  total: number;
  totalPages: number;
  expiresAt: string;
  cached: boolean;
};

export type CheckoutMeta = {
  currency: "USD" | "INR";
  exchangeRate: number;
  freeDownloadsUsed: number;
  freeDownloadsLimit: number;
  eligibleForFree: boolean;
};

export type PaymentData = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  shopDomain?: string;
  resource?: string;
  itemIds?: string[];
  free?: boolean;
  couponId?: number | null;
};

/** Selection identity for a record, matching the dashboard's `id` column. */
export function recordId(item: any): string {
  return String(item?.id ?? item?.ID ?? "");
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function truncateCell(text: string): string {
  return text.length > CELL_TRUNCATE_LENGTH
    ? `${text.slice(0, CELL_TRUNCATE_LENGTH)}…`
    : text;
}

/** Human-readable output label per export direction. */
export function outputFormatLabel(direction: ExportDirection): string {
  return direction === "shopify_to_wp"
    ? "WordPress WXR (.xml)"
    : "Shopify import (.csv)";
}

/** CTA label for the generate button. */
export function ctaLabel(direction: ExportDirection, count: number): string {
  const noun = `Record${count !== 1 ? "s" : ""}`;
  return direction === "shopify_to_wp"
    ? `Generate WP Import (${count} ${noun})`
    : `Generate Shopify CSV (${count} ${noun})`;
}

/** Busy copy shown inside the CTA while the pipeline runs. */
export function pipelineBusyLabel(
  pipeline: PipelineState,
  checkingEligibility: boolean,
): string | null {
  if (pipeline.phase === "uploading")
    return `Collecting ${pipeline.uploaded}/${pipeline.totalBatches}`;
  if (pipeline.phase === "processing")
    return `Preparing ${pipeline.processed}/${pipeline.totalBatches}`;
  if (pipeline.phase === "downloading") return "Packaging…";
  if (checkingEligibility && pipeline.phase === "idle")
    return "Checking eligibility…";
  return null;
}
