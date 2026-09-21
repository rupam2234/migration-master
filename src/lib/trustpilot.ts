const API_KEY = process.env.TRUSTPILOT_API_KEY;
const BUSINESS_UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface TrustpilotStats {
  rating: number;
  count: number;
}

interface TrustStats extends TrustpilotStats {
  fetchedAt: number;
}

// In-memory cache shared by the /api/trustpilot route and server rendering.
let cache: TrustStats | null = null;

// Defensively read the trustScore / review count from the Business Unit
// response, which can come back in a couple of shapes.
function parseStats(json: any): TrustpilotStats | null {
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

/**
 * Returns Trustpilot rating/review count, or { rating: 0, count: 0 } when
 * the API is not configured or unreachable. Callers treat 0/0 as "use
 * static fallback values" (same contract as the old /api/trustpilot route).
 */
export async function getTrustpilotStats(): Promise<TrustpilotStats> {
  // Nothing configured → no calls, no errors; callers use static values.
  if (!API_KEY || !BUSINESS_UNIT_ID) {
    return { rating: 0, count: 0 };
  }

  // Serve fresh cache without hitting Trustpilot again.
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { rating: cache.rating, count: cache.count };
  }

  try {
    const url = `https://api.trustpilot.com/v1/public/business-units/${BUSINESS_UNIT_ID}?apikey=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "migration-master/1.0",
      },
      // Never fetch more often than the in-memory TTL anyway.
      next: { revalidate: CACHE_TTL_MS / 1000 },
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
    return { rating: cache.rating, count: cache.count };
  } catch (error) {
    console.error("Failed to fetch Trustpilot stats", error);
    // Stale-but-real data beats an error; otherwise clean zeros.
    if (cache) {
      return { rating: cache.rating, count: cache.count };
    }
    return { rating: 0, count: 0 };
  }
}