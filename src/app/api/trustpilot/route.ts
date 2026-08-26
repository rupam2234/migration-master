const API_KEY = process.env.TRUSTPILOT_API_KEY;
const BUSINESS_UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface TrustStats {
  rating: number;
  count: number;
  fetchedAt: number;
}

let cache: TrustStats | null = null;

// Defensively read the trustScore / review count from the Business Unit
// response, which can come back in a couple of shapes.
function parseStats(json: any): { rating: number; count: number } | null {
  const ts = json?.trustScore ?? {};
  const rating = Number(ts?.trustScore ?? ts?.stars);
  const count = Number(
    ts?.numberOfReviews?.total ?? json?.numberOfReviews?.total,
  );
  if (
    !Number.isFinite(rating) ||
    !Number.isFinite(count) ||
    rating <= 0 ||
    count <= 0
  ) {
    return null;
  }
  return { rating, count };
}

export async function GET() {
  // Nothing configured → no calls, no errors; component uses static values.
  if (!API_KEY || !BUSINESS_UNIT_ID) {
    return Response.json({ rating: 0, count: 0 });
  }

  // Serve fresh cache without hitting Trustpilot again.
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return Response.json({ rating: cache.rating, count: cache.count });
  }

  try {
    const url = `https://api.trustpilot.com/v1/public/business-units/${BUSINESS_UNIT_ID}?apikey=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "migration-master/1.0",
      },
    });
    if (!res.ok) {
      throw new Error(`Trustpilot API responded ${res.status}`);
    }

    const parsed = parseStats(await res.json());
    if (!parsed) {
      throw new Error("No trustScore/reviewCount in API response");
    }

    cache = {
      rating: Math.round(parsed.rating * 10) / 10,
      count: parsed.count,
      fetchedAt: Date.now(),
    };
    return Response.json(
      { rating: cache.rating, count: cache.count },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch Trustpilot stats", error);
    // Stale-but-real data beats an error; otherwise clean zeros.
    if (cache) {
      return Response.json({ rating: cache.rating, count: cache.count });
    }
    return Response.json({ rating: 0, count: 0 });
  }
}