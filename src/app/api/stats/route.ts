import { getSiteStats } from "@/lib/stats";

export async function GET() {
  const stats = await getSiteStats();

  if (!stats) {
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
  }

  return Response.json(stats);
}
