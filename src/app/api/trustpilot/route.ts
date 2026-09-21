import { getTrustpilotStats } from "@/lib/trustpilot";

export async function GET() {
  const { rating, count } = await getTrustpilotStats();

  const ok = rating > 0 && count > 0;
  // Real data is cacheable hard; unconfigured/error fallback gets a short
  // cache (max-age covers the browser, s-maxage the CDN) so repeated client
  // fetches stay cheap but recover quickly.
  const headers = {
    "Cache-Control": ok
      ? "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
      : "public, max-age=60, s-maxage=60, stale-while-revalidate=600",
  };

  return Response.json({ rating, count }, { headers });
}