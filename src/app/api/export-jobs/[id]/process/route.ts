import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  claimNextBatch,
  failPipelineJob,
  finalizeIfComplete,
  getPipelineJob,
  processBatch,
} from "@/lib/export-pipeline";

// Batch transforms are bounded (~150 records), but give large XML/CSV
// generations headroom on Vercel.
export const maxDuration = 60;

/**
 * Processes exactly ONE unprocessed batch per invocation. The client loops
 * this endpoint until `done: true`, which keeps every function execution
 * short, makes the job resumable (a failed batch is retried by calling
 * again), and spreads Neon/source load over time.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const job = await getPipelineJob(params.id, user.id);

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (job.status === "READY") {
      return NextResponse.json({
        done: true,
        status: job.status,
        processed: job.processed_batches,
        total: job.total_batches,
        partCount: job.part_count,
      });
    }

    if (job.status === "FAILED") {
      return NextResponse.json(
        { message: job.error ?? "Job previously failed" },
        { status: 409 },
      );
    }

    if (job.status === "AWAITING_DATA") {
      return NextResponse.json(
        { message: "Batch upload is not complete for this job" },
        { status: 409 },
      );
    }

    const batch = await claimNextBatch(job.id);

    // Nothing left to claim → finalize (also guards duplicate final calls).
    if (!batch) {
      const finalized = await finalizeIfComplete(job.id);

      return NextResponse.json({
        done: true,
        status: finalized?.status ?? "READY",
        processed: finalized?.processed_batches ?? job.processed_batches,
        total: finalized?.total_batches ?? job.total_batches,
        partCount: finalized?.part_count ?? job.part_count,
      });
    }

    try {
      await processBatch(job, batch);
    } catch (err) {
      await failPipelineJob(job.id, err);
      throw err;
    }

    const finalized = await finalizeIfComplete(job.id);

    return NextResponse.json({
      done: Boolean(finalized),
      status: finalized?.status ?? "PROCESSING",
      processed: finalized?.processed_batches ?? job.processed_batches + 1,
      total: finalized?.total_batches ?? job.total_batches,
      partCount: finalized?.part_count ?? job.part_count,
    });
  } catch (err: any) {
    console.error("Failed to process batch:", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to process batch" },
      { status: 500 },
    );
  }
}
