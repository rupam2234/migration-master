import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib";
import { requireUser } from "@/lib/api";
import {
  createPipelineJob,
  isSupportedExportResource,
  PIPELINE_BATCH_SIZE,
  seedJobBatchesFromSnapshot,
  type ExportDirection,
  type SnapshotSelection,
} from "@/lib/export-pipeline";

interface CreateJobBody {
  project?: string;
  direction?: ExportDirection;
  resource?: string;
  totalItems?: number;
  totalBatches?: number;
  cfg?: Record<string, unknown> | null;
  /**
   * Snapshot path: when present, the server seeds the job's source batches
   * straight from the snapshot and the caller-supplied totals are ignored.
   */
  snapshotId?: string;
  selection?: { mode?: "all" | "ids"; ids?: unknown[] };
}

/** Upper bound on an explicit id list, mirroring the snapshot record cap. */
const MAX_SELECTION_IDS = 50_000;

/**
 * Creates an export pipeline job.
 *
 * Preferred path — `snapshotId` + `selection`: the server copies the records
 * out of the snapshot, so the browser never uploads data and item counts are
 * derived server-side rather than trusted from the client.
 *
 * Legacy path — no `snapshotId`: the client uploads the (already fetched)
 * records afterwards, one batch per request to /api/export-jobs/[id]/batches.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: CreateJobBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const {
    project,
    direction,
    resource,
    totalItems = 0,
    totalBatches = 0,
    cfg = null,
    snapshotId,
    selection,
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

  const seedingFromSnapshot = typeof snapshotId === "string" && snapshotId.length > 0;

  if (!seedingFromSnapshot && (
    !Number.isInteger(totalBatches) ||
    totalBatches < 1 ||
    totalBatches > 1000
  )) {
    return NextResponse.json(
      { message: "totalBatches must be an integer between 1 and 1000" },
      { status: 400 },
    );
  }

  // Validate the selection up-front so a malformed request costs nothing.
  let snapshotSelection: SnapshotSelection | null = null;

  if (seedingFromSnapshot) {
    if (selection?.mode === "all") {
      snapshotSelection = "all";
    } else {
      const ids = Array.isArray(selection?.ids)
        ? selection.ids.map(String)
        : [];

      if (ids.length === 0) {
        return NextResponse.json(
          { message: "selection.ids is required when mode is not 'all'" },
          { status: 400 },
        );
      }

      if (ids.length > MAX_SELECTION_IDS) {
        return NextResponse.json(
          { message: `selection exceeds ${MAX_SELECTION_IDS} records` },
          { status: 400 },
        );
      }

      snapshotSelection = { ids };
    }
  }

  try {
    const job = await createPipelineJob({
      userId: user.id,
      project,
      direction,
      resource,
      resource_label:
        direction === "shopify_to_wp"
          ? resource.toUpperCase()
          : resource.charAt(0).toUpperCase() + resource.slice(1),
      // With server-side seeding the true counts are unknown until the
      // snapshot is read — they are written by seedJobBatchesFromSnapshot.
      totalItems: seedingFromSnapshot ? 0 : totalItems,
      totalBatches: seedingFromSnapshot ? 0 : totalBatches,
      cfg: cfg as CreatePipelineJobCfg,
    });

    if (!seedingFromSnapshot || !snapshotSelection) {
      return NextResponse.json(
        {
          id: job.id,
          status: job.status,
          totalItems: job.total_items,
          totalBatches: job.total_batches,
          batchSize: PIPELINE_BATCH_SIZE,
        },
        { status: 201 },
      );
    }

    const seeded = await seedJobBatchesFromSnapshot({
      jobId: job.id,
      userId: user.id,
      snapshotId: snapshotId as string,
      selection: snapshotSelection,
    });

    if (seeded.totalItems === 0) {
      return NextResponse.json(
        {
          message:
            "No records matched the selection. The snapshot may have expired — fetch again.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        id: job.id,
        status: "PROCESSING",
        totalItems: seeded.totalItems,
        totalBatches: seeded.totalBatches,
        batchSize: PIPELINE_BATCH_SIZE,
        seededFromSnapshot: true,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Failed to create export job:", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to create export job" },
      { status: 500 },
    );
  }
}

type CreatePipelineJobCfg = Record<string, unknown> & { siteUrl: string };


export async function GET(req: NextRequest) {
  const shop = req.headers.get("shop");

  if (!shop) {
    return NextResponse.json("Bad Request", { status: 400 })
  }

  try {
    const result = await pool.query(
      `SELECT id, item_count, status, created_at, updated_at FROM export_jobs WHERE shop_domain = $1`,
      [shop],
      { fetchOptions: { priority: "high" } }
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(error.message, { status: 500 });
  }
}
