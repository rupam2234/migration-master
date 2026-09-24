import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getPipelineJob } from "@/lib/export-pipeline";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const job = await getPipelineJob(params.id, user.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      item_count: job.total_items,
      exportedItemCount: job.part_count,
      status: job.status,
      project: job.project,
      direction: job.direction,
      resource: job.resource,
      coupon: null,
      paymentId: null,
    });
  } catch (err: unknown) {
    console.error("Export job detail error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load export job" },
      { status: 500 },
    );
  }
}
