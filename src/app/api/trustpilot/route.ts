import { getTrustpilotStats } from "@/lib/trustpilot";

export async function GET() {
  const { rating, count } = await getTrustpilotStats();

  const headers =
    rating > 0 && count > 0
      ? {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        }
      : undefined;

  return Response.json({ rating, count }, { headers });
}