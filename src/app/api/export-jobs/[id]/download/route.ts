import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getPipelineJob } from "@/lib/export-pipeline";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    if (job.status !== "READY") {
      return NextResponse.json(
        { message: "Your export files will be available as soon as the migration is complete." },
        { status: 400 },
      );
    }

    // Get all batches and create a zip file
    const { pool } = await import("@/lib");
    const parts = await pool.query(
      `SELECT part_number, filename, content
       FROM export_job_parts
       WHERE job_id = $1
       ORDER BY part_number`,
      [params.id]
    );

    if (parts.length === 0) {
      return NextResponse.json(
        { message: "Your export files are still being prepared. Please try again shortly." },
        { status: 404 },
      );
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const part of parts) {
      const content = Buffer.from(part.content, "base64").toString("utf-8");
      zip.file(part.filename, content);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="export-${params.id}.zip"`,
      },
    });

  } catch (error: any) {
    console.error("Failed to download export:", error);
    return NextResponse.json(
      { message: "We couldn’t prepare your export files. Please try again shortly." },
      { status: 500 }
    );
  }
}