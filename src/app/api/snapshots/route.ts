import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  isSupportedExportResource,
  type ExportDirection,
} from "@/lib/export-pipeline";
import { acquireRedisLock, releaseRedisLock } from "@/lib/redis";
import { requiresScope } from "@/lib/sharedResources";
import {
  SNAPSHOT_PAGE_SIZE,
  deleteExpiredSnapshots,
  findLiveSnapshot,
  normalizeItems,
  readSnapshotPage,
  saveSnapshot,
  type SnapshotRow,
} from "@/lib/snapshots";

/**
 * Hard ceiling on records per snapshot. Keeps a single request's memory and
 * storage bounded; raise deliberately once snapshots stream from the source
 * page-by-page instead of from one buffered fetch.
 */
const MAX_SNAPSHOT_ITEMS = 50_000;

/** Fetch lock TTL — long enough to cover a slow upstream, short enough to self-heal. */
const FETCH_LOCK_TTL_MS = 60_000;

export const maxDuration = 60;

interface CreateSnapshotBody {
  project?: string;
  direction?: ExportDirection;
  resource?: string;
  /** Force a re-fetch even when a live snapshot exists. */
  refresh?: boolean;
  /** Scope value for resources fetched per blog (Shopify articles). */
  blogId?: string;
  /**
   * Set false to skip preview records entirely — used when the caller already
   * has rows to show and only needs metadata (total, TTL, id).
   */
  preview?: boolean;
}

/**
 * Creates (or reuses) the snapshot for a project + resource.
 *
 * The heavy lifting happens server-side: the platform proxy route is called
 * server-to-server and its records are archived as gzip pages. The client
 * only ever receives a bounded preview, which is what makes this safe for
 * large stores and for any tab.
 *
 * Request budget:
 *   - live snapshot      → 1 SELECT, no upstream calls
 *   - cold/first fetch   → 1 upstream fan-out, ~1 statement per 50 pages
 *   - concurrent callers → collapsed to ONE upstream fan-out by a Redis lock
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: CreateSnapshotBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const {
    project,
    direction,
    resource,
    refresh = false,
    blogId,
    preview: withPreview = true,
  } = body;

  if (!project || !direction || !resource) {
    return NextResponse.json(
      { message: "project, direction and resource are required" },
      { status: 400 },
    );
  }

  if (direction !== "shopify_to_wp" && direction !== "wp_to_shopify") {
    return NextResponse.json(
      { message: `Unsupported direction: ${direction}` },
      { status: 400 },
    );
  }

  if (!isSupportedExportResource(direction, resource)) {
    return NextResponse.json(
      { message: `Unsupported resource "${resource}" for ${direction}` },
      { status: 400 },
    );
  }

  // Scoped resources are fetched per blog, which this screen cannot know —
  // the records already loaded in the session are exported directly instead.
  if (requiresScope(resource) && !blogId) {
    return NextResponse.json(
      {
        message:
          "This resource is fetched per blog, so the records already loaded in this session will be exported directly.",
      },
      { status: 422 },
    );
  }

  const owner = { userId: user.id, project, direction, resource };

  try {
    // Fast path: an existing snapshot costs one SELECT for the whole TTL.
    if (!refresh) {
      const live = await findLiveSnapshot(owner);

      if (live) {
        return NextResponse.json(
          await snapshotResponse(live, {
            cached: true,
            includePreview: withPreview,
          }),
        );
      }
    }

    const lockKey = `snapshot:fetch:${user.id}:${direction}:${project}:${resource}`;
    const hasLock = await acquireRedisLock(lockKey, FETCH_LOCK_TTL_MS);

    if (!hasLock) {
      return NextResponse.json(
        {
          message:
            "A fetch for this resource is already running. Retry in a moment.",
          retryAfter: 2,
        },
        { status: 409 },
      );
    }

    try {
      const items = await fetchSourceItems(req, project, direction, resource, {
        blogId,
      });

      if (items.length > MAX_SNAPSHOT_ITEMS) {
        return NextResponse.json(
          {
            message:
              `This resource has ${items.length.toLocaleString()} records, ` +
              `above the ${MAX_SNAPSHOT_ITEMS.toLocaleString()} per-export limit.`,
          },
          { status: 413 },
        );
      }

      const snapshot = await saveSnapshot({
        ...owner,
        items,
        sourceHost: project,
      });

      // Opportunistic housekeeping — expired snapshots are cheapest to drop
      // here rather than from a scheduled job.
      await deleteExpiredSnapshots().catch(() => undefined);

      return NextResponse.json(
        await snapshotResponse(snapshot, {
          cached: false,
          includePreview: withPreview,
          preview: withPreview ? items.slice(0, SNAPSHOT_PAGE_SIZE) : undefined,
        }),
        { status: 201 },
      );
    } finally {
      await releaseRedisLock(lockKey);
    }
  } catch (err: any) {
    console.error("Failed to create snapshot:", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch records" },
      { status: 502 },
    );
  }
}

/**
 * Calls the platform proxy route server-to-server, reusing the caller's
 * session. This keeps a single implementation of Shopify GraphQL paging and
 * WordPress/Woo pagination — the snapshot layer is purely an archiver.
 */
async function fetchSourceItems(
  req: NextRequest,
  project: string,
  direction: ExportDirection,
  resource: string,
  options: { blogId?: string } = {},
): Promise<any[]> {
  const origin = req.nextUrl.origin;
  const cookie = req.headers.get("cookie") ?? "";

  const blogScope = options.blogId
    ? `&blogId=${encodeURIComponent(options.blogId)}`
    : "";

  const { url, headers } =
    direction === "shopify_to_wp"
      ? {
          url: `${origin}/api/shopify/${resource}/fetch?shop=${encodeURIComponent(
            project,
          )}${blogScope}`,
          headers: { cookie },
        }
      : {
          url: `${origin}/api/wordpress/${resource}/fetch`,
          headers: { cookie, "x-projectName": project, asset: resource },
        };

  const res = await fetch(url, { headers, cache: "no-store" });

  if (!res.ok) {
    const failure = await res.json().catch(() => null);
    throw new Error(failure?.message ?? `Failed to fetch ${resource}`);
  }

  return normalizeItems(await res.json());
}

/** Shapes a snapshot row into the payload the export screen consumes. */
async function snapshotResponse(
  snapshot: SnapshotRow,
  options: { cached: boolean; preview?: any[]; includePreview?: boolean },
) {
  const includePreview = options.includePreview ?? true;

  const preview = !includePreview
    ? undefined
    : (options.preview ?? (await readSnapshotPage(snapshot.id, 1)));

  return {
    snapshotId: snapshot.id,
    total: snapshot.total_items,
    totalPages: snapshot.total_pages,
    pageSize: snapshot.page_size || SNAPSHOT_PAGE_SIZE,
    expiresAt: snapshot.expires_at,
    cached: options.cached,
    preview,
  };
}
