import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  activateExportJob,
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
      return NextResponse.json(
        { message: "We couldn’t find that export." },
        { status: 404 },
      );
    }

    if (job.status !== "QUEUED" && job.status !== "PAID" && job.status !== "PROCESSING") {
      return NextResponse.json(
        { message: "This export is no longer active." },
        { status: 409 },
      );
    }

    if (job.status === "QUEUED" || job.status === "PAID") {
      const activated = await activateExportJob(job.id);
      if (!activated) {
        return NextResponse.json({
          done: false,
          queued: true,
          status: "QUEUED",
          message: "Your export is safely queued and will begin as soon as capacity is available.",
        }, { status: 202 });
      }
      job.status = "PROCESSING";
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
      { message: "We couldn’t complete your export. Your progress is saved; please try again shortly." },
      { status: 500 },
    );
  }
}
