import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { decompressArtifact, getJobPart, getPipelineJob } from "@/lib/export-pipeline";

/**
 * Streams one generated artifact part (WXR part / CSV part) for download.
 * Content is stored gzipped; decompressed here on the way out.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; part: string } },
) {
  const { user, error } = await requireUser();
  if (error) return error;

  const partNumber = Number(params.part);

  if (!Number.isInteger(partNumber) || partNumber < 1) {
    return NextResponse.json({ message: "Invalid part number" }, { status: 400 });
  }

  try {
    const job = await getPipelineJob(params.id, user.id);

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    const part = await getJobPart(job.id, partNumber);

    if (!part) {
      return NextResponse.json(
        { message: `Part ${partNumber} not found` },
        { status: 404 },
      );
    }

    const content = decompressArtifact(part.content);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type":
          job.direction === "shopify_to_wp"
            ? "application/xml; charset=utf-8"
            : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${part.filename}"`,
        "X-Part-Number": String(partNumber),
      },
    });
  } catch (err: any) {
    console.error("Failed to fetch job part:", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch job part" },
      { status: 500 },
    );
  }
}
