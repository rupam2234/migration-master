import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib";
import { requireUser } from "@/lib/api";
import {
  createPaidExportJob,
  getActiveExportJob,
  isSupportedExportResource,
  PIPELINE_BATCH_SIZE,
  type ExportDirection,
  type SnapshotSelection,
} from "@/lib/export-pipeline";

interface CreateJobBody {
  project?: string;
  direction?: ExportDirection;
  resource?: string;
  cfg?: Record<string, unknown> | null;
  /**
   * Snapshot path: required for all exports
   */
  snapshotId?: string;
  selection?: { mode?: "all" | "ids"; ids?: unknown[] };
  requiredCredits?: number;
  paymentTransactionId?: string;
}

/**
 * Creates an export pipeline job using credits.
 *
 * This is the only export method - users must have sufficient credits to create jobs.
 * The server seeds the job's source batches from the snapshot and deducts credits
 * atomically.
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
    snapshotId,
    selection,
    requiredCredits,
    paymentTransactionId,
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

  // Credit-based exports are seeded from a ready server-side snapshot.
  // The server uses that snapshot to calculate billable items and seed the job.
  if (!seedingFromSnapshot) {
    return NextResponse.json(
      { message: "A ready snapshot is required to create an export job" },
      { status: 400 },
    );
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(snapshotId)) {
    return NextResponse.json(
      { message: "Invalid export snapshot" },
      { status: 400 },
    );
  }

  if (requiredCredits !== undefined && !Number.isInteger(requiredCredits)) {
    return NextResponse.json(
      { message: "requiredCredits must be an integer" },
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

      snapshotSelection = { ids };
    }
  } else {
    // For direct exports (no snapshot), we need to handle the selection directly
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

      snapshotSelection = { ids };
    }
  }

  try {
    const active = await getActiveExportJob({
      userId: user.id,
      project,
      direction,
      resource,
    });
    if (active) {
      return NextResponse.json({
        id: active.id,
        status: active.status,
        totalItems: active.total_items,
        totalBatches: active.total_batches,
        batchSize: PIPELINE_BATCH_SIZE,
        message: "This export is already in progress. We’ll keep you updated here.",
      }, { status: 200 });
    }

    const result = await createPaidExportJob({
      userId: user.id,
      project,
      direction,
      resource,
      resourceLabel: resource,
      snapshotId,
      selection: snapshotSelection || { ids: [] },
      requiredCredits: requiredCredits ?? 0,
      paymentTransactionId,
    });

    return NextResponse.json({
      id: result.jobId,
      status: "QUEUED",
      totalItems: result.totalItems,
      totalBatches: result.totalBatches,
      batchSize: PIPELINE_BATCH_SIZE,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Failed to create export job:", err);

    if (err?.code === "23505") {
      return NextResponse.json(
        { message: "This export is already in progress. We’ll keep you updated here." },
        { status: 409 },
      );
    }

    const message = String(err?.message ?? "");
    if (message.includes("Insufficient credits")) {
      return NextResponse.json({ message }, { status: 400 });
    }
    if (message.includes("Snapshot") || message.includes("snapshot")) {
      return NextResponse.json(
        { message: "Your records are still being prepared. Please try again in a moment." },
        { status: 409 },
      );
    }
    if (message.includes("credit")) {
      return NextResponse.json(
        { message: "We couldn’t confirm your credits. Please try again." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "We couldn’t start your export. Please try again in a moment." },
      { status: 500 },
    );
  }
}

/**
 * Lists a shop's export jobs with every field the jobs screen needs in ONE
 * round trip: job rows + coupon + payment id + exported-item count. Folding
 * the old per-job detail request into this list keeps the whole page at a
 * single server request — aggregates are scoped to this shop's job ids so
 * they stay bounded.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const shop = req.nextUrl.searchParams.get("shop") ?? req.headers.get("shop");
  if (!shop) {
    return NextResponse.json("Bad Request", { status: 400 });
  }

  try {
    const jobs = await pool.query(
      `SELECT j.id,
              j.total_items AS item_count,
              j.status,
              j.created_at,
              j.updated_at,
              pt.coupon_code,
              c.discount_percent AS coupon_percent,
              j.part_count AS exported_count,
              pt.transaction_id AS razorpay_payment_id
       FROM export_pipeline_jobs j
       LEFT JOIN payment_transactions pt ON pt.id = j.payment_transaction_id
       LEFT JOIN credit_coupons c ON c.id = pt.coupon_id
       WHERE j.user_id = $1 AND j.project = $2
       ORDER BY j.created_at DESC`,
      [user.id, shop],
      { fetchOptions: { priority: "high" } }
    );
    return NextResponse.json(jobs, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(error.message, { status: 500 });
  }
}