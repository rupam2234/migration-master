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

const SNAPSHOT_REQUEST_CACHE_MS = 30_000;
const snapshotRequestCache = new Map<
  string,
  { expiresAt: number; promise: Promise<SnapshotResponse> }
>();

function snapshotCacheKey(body: SnapshotRequest): string {
  return JSON.stringify({
    project: body.project,
    direction: body.direction,
    resource: body.resource,
    refresh: body.refresh ?? false,
    blogId: body.blogId ?? null,
    preview: body.preview ?? true,
  });
}

/**
 * Creates (or reuses) the server-side snapshot for a resource.
 *
 * A concurrent fetch (React StrictMode's double mount, a double-click, or a
 * second tab) shares the same in-flight promise. The server-side Redis lock
 * remains the authority across tabs and server instances.
 */
export async function requestSnapshot(
  body: SnapshotRequest,
): Promise<SnapshotResponse> {
  const key = snapshotCacheKey(body);
  const cached = snapshotRequestCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    snapshotRequestCache.delete(key);
    return cached.promise;
  }

  const promise = requestSnapshotUncached(body);
  snapshotRequestCache.set(key, {
    expiresAt: Date.now() + SNAPSHOT_REQUEST_CACHE_MS,
    promise,
  });

  try {
    return await promise;
  } finally {
    const current = snapshotRequestCache.get(key);
    if (current?.promise === promise) {
      snapshotRequestCache.delete(key);
    }
  }
}

async function requestSnapshotUncached(
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
export type OwnershipSummary = {
  selectedCount: number;
  ownedCount: number;
  newCount: number;
};

export async function loadOwnershipSummary(input: {
  project: string;
  direction: ExportDirection;
  resource: string;
  itemIds: string[];
}): Promise<OwnershipSummary> {
  const res = await fetch("/api/export-ownership", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new Error(data?.message ?? "We couldn’t check the selected records.");
  }
  return data;
}

export async function loadAllRecordIds(snapshotId: string): Promise<string[]> {
  const res = await fetch(`/api/snapshots/${snapshotId}?ids=1`);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message ?? "Failed to load record ids");
  }

  return Array.isArray(data.ids) ? data.ids : [];
}
