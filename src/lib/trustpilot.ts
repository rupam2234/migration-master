import { unstable_cache } from "next/cache";

const API_KEY = process.env.TRUSTPILOT_API_KEY;
const BUSINESS_UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID;
const REVALIDATE_SECONDS = 6 * 60 * 60; // 6h — reviews change at human speed

export interface TrustpilotStats {
  rating: number;
  count: number;
}

// Last successfully-parsed values, used as stale-on-error fallback.
let lastGood: TrustpilotStats | null = null;

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

async function fetchTrustpilot(): Promise<TrustpilotStats> {
  const url = `https://api.trustpilot.com/v1/public/business-units/${BUSINESS_UNIT_ID}?apikey=${encodeURIComponent(API_KEY!)}`;
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

  lastGood = {
    rating: Math.round(parsed.rating * 10) / 10,
    count: parsed.count,
  };
  return lastGood;
}

// Next's persistent data cache: survives across serverless instances and
// deploys (unlike in-memory caches), so Trustpilot is hit at most once per 6h.
const getCachedTrustpilot = unstable_cache(
  fetchTrustpilot,
  ["trustpilot-stats"],
  { revalidate: REVALIDATE_SECONDS, tags: ["trustpilot"] },
);

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

  try {
    return await getCachedTrustpilot();
  } catch (error) {
    console.error("Failed to fetch Trustpilot stats", error);
    // Stale-but-real data beats an error; otherwise clean zeros.
    return lastGood ?? { rating: 0, count: 0 };
  }
}