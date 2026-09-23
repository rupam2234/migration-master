import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  getEstimate,
  type EstimateDirection,
  type EstimateSnapshot,
} from "@/lib/estimate";

/**
 * GET /api/estimate?project=<name>&refresh=1
 *
 * Free migration estimator: per-resource record counts (cached, 24h TTL) and
 * credit estimates derived with the same rules the payment routes use.
 * Never fetches item bodies — counts only.
 *
 * A store is counted as one transaction (see `lib/estimate`), so a successful
 * response always describes EVERY resource with a terminal state — nothing is
 * left "in progress" for the dashboard to spin on. While a run is still going
 * (or when another tab started one) the route answers 202 with
 * `status: "RUNNING"` plus the previous snapshot when there is one, and the
 * client polls this endpoint until the commit lands.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireUser();
  if (error) return error;

  const project = req.nextUrl.searchParams.get("project");
  if (!project) {
    return NextResponse.json({ message: "Missing project parameter" }, { status: 400 });
  }

  const force = req.nextUrl.searchParams.get("refresh") === "1";

  const direction: EstimateDirection = project.includes("myshopify")
    ? "shopify_to_wp"
    : "wp_to_shopify";

  try {
    const { snapshot, cached, running } = await getEstimate(
      project,
      direction,
      force,
    );

    // No committed snapshot yet and a run is under way: nothing to show but a
    // promise, so answer 202/RUNNING and let the client poll instead of
    // rendering half a dashboard.
    const waitingForFirstSnapshot = running && snapshot === null;

    return NextResponse.json(
      {
        project,
        direction,
        status: waitingForFirstSnapshot ? "RUNNING" : "READY",
        cached,
        /** A run is in flight; this body may be a previous snapshot. */
        refreshing: running,
        ...snapshotPayload(snapshot),
      },
      { status: waitingForFirstSnapshot ? 202 : 200 },
    );
  } catch (err: any) {
    console.error("Estimation error:", err);

    // The estimator needs its own tables; a missing migration is a setup
    // problem, not a source problem, so say so plainly.
    const missingSchema =
      err?.code === "42P01" ||
      /relation .* does not exist/i.test(String(err?.message ?? ""));

    return NextResponse.json(
      {
        message: missingSchema
          ? "Estimator tables are missing. Run `npm run db:migrate` to create them."
          : "Failed to build estimates. Individual resource fetching may still work.",
        error: err.message,
      },
      { status: 502 },
    );
  }
}

/** Flattens a snapshot into the shape the dashboard consumes. */
function snapshotPayload(snapshot: EstimateSnapshot | null) {
  return {
    partial: snapshot?.partial ?? true,
    updatedAt: snapshot?.updatedAt ?? null,
    estimates: snapshot?.resources ?? {},
    totalCredits: snapshot?.totalCredits ?? null,
  };
}

