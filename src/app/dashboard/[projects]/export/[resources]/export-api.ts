import {
  LOCAL_ROW_LIMIT,
  PAGE_FETCH_CONCURRENCY,
  SNAPSHOT_PAGE_SIZE,
  type ExportDirection,
} from "./export-config";

export type SnapshotRequest = {
  project: string;
  direction: ExportDirection;
  resource: string;
  refresh?: boolean;
  blogId?: string;
  /** Set false to skip preview rows (metadata-only call). */
  preview?: boolean;
};

type SnapshotResponse = {
  res: Response;
  data: any;
};

/**
 * Creates (or reuses) the server-side snapshot for a resource.
 *
 * A concurrent fetch (React StrictMode's double mount, a double-click, or a
 * second tab) is answered with 409 + a retry hint; honour that hint once
 * instead of showing the user a transient error.
 */
export async function requestSnapshot(
  body: SnapshotRequest,
): Promise<SnapshotResponse> {
  const post = () =>
    fetch("/api/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  let res = await post();

  if (res.status === 409) {
    const hinted = await res.clone().json().catch(() => null);
    await new Promise((resolve) =>
      setTimeout(resolve, (hinted?.retryAfter ?? 2) * 1000),
    );
    res = await post();
  }

  return { res, data: await res.json().catch(() => null) };
}

/**
 * Pulls the working set (page 2 onward, up to {@link LOCAL_ROW_LIMIT}) in
 * bounded parallel chunks. Page 1 already arrived as the snapshot preview.
 */
export async function loadWorkingRows(
  snapshotId: string,
  totalPages: number,
): Promise<any[]> {
  const lastPage = Math.min(
    totalPages,
    Math.max(1, Math.floor(LOCAL_ROW_LIMIT / SNAPSHOT_PAGE_SIZE)),
  );

  const pages = Array.from({ length: Math.max(0, lastPage - 1) }, (_, i) => i + 2);
  const collected: any[] = [];

  for (let i = 0; i < pages.length; i += PAGE_FETCH_CONCURRENCY) {
    const chunk = pages.slice(i, i + PAGE_FETCH_CONCURRENCY);

    const results = await Promise.all(
      chunk.map(async (page) => {
        try {
          const res = await fetch(`/api/snapshots/${snapshotId}?page=${page}`);

          if (!res.ok) return [];

          const data = await res.json().catch(() => null);

          return Array.isArray(data?.items) ? data.items : [];
        } catch {
          // A failed page degrades the local view only; the snapshot (and
          // therefore the export) is unaffected.
          return [];
        }
      }),
    );

    results.forEach((items) => collected.push(...items));
  }

  return collected;
}

/** Fetches every id in a snapshot (ids only — payload stays small). */
export async function loadAllRecordIds(snapshotId: string): Promise<string[]> {
  const res = await fetch(`/api/snapshots/${snapshotId}?ids=1`);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message ?? "Failed to load record ids");
  }

  return Array.isArray(data.ids) ? data.ids : [];
}

export type ExportEligibility = {
  allOwned: boolean;
  newItemIds: string[];
  currency: "USD" | "INR";
  exchangeRate: number;
  freeDownloadsUsed: number;
  freeDownloadsLimit: number;
  eligibleForFree: boolean;
};

/** Asks the payment gate whether the selected ids are free, owned, or billable. */
export async function checkExportEligibility(args: {
  shopDomain: string;
  resource: string;
  itemIds: string[];
}): Promise<ExportEligibility> {
  const res = await fetch("/api/payment/check-export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await res.json();

  return {
    allOwned: Boolean(data.allOwned),
    newItemIds: data.newItemIds ?? [],
    currency: data.currency ?? "USD",
    exchangeRate: data.exchangeRate ?? 83,
    freeDownloadsUsed:
      data.freeDownloadsUsed ??
      data.freeCount ??
      (data.remainingFreeExports != null
        ? Math.max(0, 3 - data.remainingFreeExports)
        : 0),
    freeDownloadsLimit: data.freeDownloadsLimit ?? 3,
    eligibleForFree: data.eligibleForFree ?? false,
  };
}
