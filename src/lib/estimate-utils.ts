/**
 * Shared bulk-image predicate used by the estimate display: bulk media exports
 * carry the 3,000-free allowance, so a count inside the allowance shows "Free".
 * Mirrors the MEDIA_LIBRARY rule in the payment routes.
 */
export function isBulkImageResource(resource: string): boolean {
  const normalized = resource.toUpperCase();
  return normalized === "IMAGES" || normalized === "MEDIA";
}

/**
 * How a single resource ended up in an estimate snapshot.
 *
 * - `OK`          → counted, `credits` is authoritative.
 * - `UNAVAILABLE` → we could not count it (no scope, source down, …). The card
 *                   says so instead of spinning on "estimating" forever.
 * - `DEFERRED`    → no cheap store-wide count exists (bulk images), so the
 *                   number is confirmed when the merchant picks the files.
 */
export type ResourceEstimateState = "OK" | "UNAVAILABLE" | "DEFERRED";

/** The per-resource shape shared by the estimator API and the asset cards. */
export interface ResourceEstimate {
    count: number | null;
    credits: number | null;
    state: ResourceEstimateState;
    /** Human-readable explanation shown as a tooltip when not `OK`. */
    reason: string | null;
    /** False when the source returned an approximate (capped) count. */
    exact: boolean;
}

