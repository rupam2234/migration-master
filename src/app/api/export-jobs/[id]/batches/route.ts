import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  PIPELINE_BATCH_SIZE,
  getPipelineJob,
  insertJobBatch,
} from "@/lib/export-pipeline";

interface UploadBatchBody {
  seq?: number;
  items?: unknown[];
}

/**
 * Uploads one batch of source records for a job. The client sends its
 * already-fetched records here in bounded chunks — no source API calls.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body: UploadBatchBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { seq, items } = body;

  if (!Number.isInteger(seq) || (seq as number) < 1) {
    return NextResponse.json(
      { message: "seq must be a positive integer (1-based)" },
      { status: 400 },
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { message: "items must be a non-empty array" },
      { status: 400 },
    );
  }

  // Server-authoritative batch size: the client picks the ids, never the
  // chunking. Keeps every payload (and every process call) within one
  // predictable work unit.
  if (items.length > PIPELINE_BATCH_SIZE) {
    return NextResponse.json(
      {
        message: `A batch may contain at most ${PIPELINE_BATCH_SIZE} records (received ${items.length})`,
      },
      { status: 413 },
    );
  }

  try {
    const job = await getPipelineJob(params.id, user.id);

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (job.status === "READY" || job.status === "FAILED") {
      return NextResponse.json(
        { message: `Job is already ${job.status}` },
        { status: 409 },
      );
    }

    if ((seq as number) > job.total_batches) {
      return NextResponse.json(
        { message: `seq exceeds total_batches (${job.total_batches})` },
        { status: 400 },
      );
    }

    await insertJobBatch(job.id, seq as number, items);

    const updated = await getPipelineJob(job.id, user.id);

    return NextResponse.json({
      uploaded: updated?.uploaded_batches ?? 0,
      total: updated?.total_batches ?? job.total_batches,
      status: updated?.status ?? job.status,
    });
  } catch (err: any) {
    console.error("Failed to upload batch:", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to upload batch" },
      { status: 500 },
    );
  }
}
