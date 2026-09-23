import { useCallback, useEffect, useRef, useState } from "react";
import type { ResourceEstimate } from "@/lib/estimate-utils";

/**
 * Client hook for the free estimation layer.
 *
 * The server counts a store as one transaction (see `lib/estimate`), so this
 * hook only ever stores complete snapshots: every resource arrives with a
 * terminal state (`OK` / `UNAVAILABLE` / `DEFERRED`). No card can sit on
 * "estimating…" forever because an unfinished resource is never rendered —
 * either the whole snapshot is in, or the strip keeps its progress state.
 *
 * While the server is still working (its run is in flight) the response carries
 * `refreshing: true`; we poll a bounded number of times so a slow store gets a
 * real answer instead of an endless spinner.
 */

/** How often to re-ask while the server is still counting the store. */
const POLL_INTERVAL_MS = 2000;

/** Attempts before giving up (≈30s), so the UI always settles. */
const POLL_MAX_ATTEMPTS = 15;

export type EstimatesMap = Record<string, ResourceEstimate>;

export interface EstimatesState {
  /** Per-resource counts + credits, keyed by resource (e.g. `PRODUCTS`). */
  estimates: EstimatesMap;
  totalCredits: number | null;
  /** True while there is no snapshot yet — cards show skeletons. */
  loading: boolean;
  /** True while the server is reconciling counts in the background. */
  refreshing: boolean;
  /** True when at least one resource could not be counted up front. */
  partial: boolean;
  /** Set when the estimate could not be produced; the UI can offer a retry. */
  error: string | null;
  /** True until a snapshot has been rendered once. */
  stale: boolean;
  /** When the snapshot was computed, ISO string. */
  updatedAt: string | null;
  refresh: () => void;
}

export function useEstimates(project: string | null): EstimatesState {
  const [estimates, setEstimates] = useState<EstimatesMap>({});
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [partial, setPartial] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Bumped whenever a load chain starts (mount, project change, manual
   * refresh) or the component tears down. Responses from an older session are
   * dropped instead of overwriting newer state.
   */
  const sessionRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const load = useCallback(
    async (
      refresh: boolean,
      attempt: number,
      session: number,
      signal: AbortSignal,
    ) => {
      if (!project) return;

      const isCurrent = () => sessionRef.current === session && !signal.aborted;

      try {
        const res = await fetch(
          `/api/estimate?project=${encodeURIComponent(project)}${
            refresh ? "&refresh=1" : ""
          }`,
          { cache: "no-store", signal },
        );

        if (!isCurrent()) return;

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setLoading(false);
          setRefreshing(false);
          setError(body?.message ?? "Could not build the migration estimate.");
          return;
        }

        const data = await res.json();
        if (!isCurrent()) return;

        const snapshot: EstimatesMap = data.estimates ?? {};
        const hasSnapshot = Object.keys(snapshot).length > 0;

        if (hasSnapshot) {
          setEstimates(snapshot);
          setTotalCredits(data.totalCredits ?? null);
          setPartial(Boolean(data.partial));
          setUpdatedAt(data.updatedAt ?? null);
          setStale(false);
        }

        const stillCounting =
          Boolean(data.refreshing) && attempt < POLL_MAX_ATTEMPTS;

        setRefreshing(stillCounting);

        if (stillCounting) {
          // The server paced its way through the source and is still going:
          // keep skeletoning only when we have nothing to show yet, and ask
          // again shortly.
          setLoading(!hasSnapshot);
          pollTimer.current = setTimeout(() => {
            void load(false, attempt + 1, session, signal);
          }, POLL_INTERVAL_MS);
          return;
        }

        setLoading(false);

        if (!hasSnapshot) {
          setError(
            "Migration estimates are unavailable for this store right now.",
          );
        }
      } catch {
        if (!isCurrent()) return;

        setLoading(false);
        setRefreshing(false);
        setError("Could not reach the estimator. Try again in a moment.");
      }
    },
    [project],
  );

  useEffect(() => {
    const session = ++sessionRef.current;
    // Session-local abort: the cleanup below never touches a ref, so the
    // request it owns is cancelled deterministically on unmount.
    const controller = new AbortController();

    stopPolling();
    setEstimates({});
    setTotalCredits(null);
    setPartial(false);
    setUpdatedAt(null);
    setStale(true);
    setRefreshing(false);
    setError(null);

    void load(false, 0, session, controller.signal);

    return () => {
      controller.abort();
      stopPolling();
    };
  }, [load, stopPolling]);

  const refresh = useCallback(() => {
    const session = ++sessionRef.current;
    const controller = new AbortController();

    stopPolling();
    setError(null);

    void load(true, 0, session, controller.signal);
  }, [load, stopPolling]);

  return {
    estimates,
    totalCredits,
    loading,
    refreshing,
    partial,
    error,
    stale,
    updatedAt,
    refresh,
  };
}
