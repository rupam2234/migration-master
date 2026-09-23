import { RefreshCwIcon, InfoIcon } from "lucide-react";

/**
 * Store-wide migration estimate strip rendered above the asset-card grid.
 * Sums every resource's credit estimate into one decision number, with a
 * refresh affordance for stale counts.
 *
 * One snapshot at a time: the strip reports either a complete estimate (with a
 * note when some resources could not be pre-counted) or that it is still
 * working — never a number that silently ignores half the store.
 */
export function EstimateStrip({
  totalCredits,
  loading,
  refreshing,
  stale,
  partial,
  onRefresh,
}: {
  totalCredits: number | null
  /** No snapshot on screen yet (cards are skeletoning). */
  loading: boolean
  /** The server is still counting the store in the background. */
  refreshing: boolean
  stale: boolean
  /** At least one resource could not be counted up front. */
  partial: boolean
  onRefresh: () => void
}) {
  const busy = loading || refreshing;

  const headline =
    totalCredits !== null ? (
      <span>
        <span className="text-muted-foreground">
          {partial ? "Estimated minimum:" : "Full migration estimate:"}
        </span>{" "}
        <span className="font-semibold text-primary">
          ~{totalCredits.toLocaleString()} credits
        </span>
      </span>
    ) : busy ? (
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        {refreshing ? "Counting your store..." : "Estimating migration cost..."}
      </span>
    ) : (
      <span className="text-amber-600">Estimates unavailable</span>
    );

  const note =
    totalCredits === null
      ? null
      : partial
      ? "Some resources can't be counted up front (images are confirmed when you pick them) — the exact total is confirmed before payment."
      : "1 credit = 1 item • Images over 3,000 count as multiple items";

  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-white/50 backdrop-blur-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <InfoIcon size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{headline}</p>
          {note && (
            <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        title="Re-count from source"
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          busy
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : stale
            ? "bg-primary/10 text-primary hover:bg-primary/20"
            : "bg-green-50 text-green-700 hover:bg-green-100"
        }`}
      >
        <RefreshCwIcon size={12} className={busy ? "animate-spin" : ""} />
        {busy ? "Refreshing..." : stale ? "Refresh estimate" : "Updated"}
      </button>
    </div>
  );
}
