"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import styles from "@/app/(home)/style.module.css";

/* -------------------------------------------------------------------------
 * Display values shown until live Trustpilot data (from /api/trustpilot,
 * via the official Business Units API) arrives. Update these to match your
 * real Trustpilot figures when you don't yet have the API configured.
 * ------------------------------------------------------------------------- */
const FALLBACK_RATING = 4.9;
const FALLBACK_REVIEW_COUNT = 3;
const TRUSTPILOT_URL =
  "https://www.trustpilot.com/review/migrationmaster.online";

/** TrustScore -> star-word buckets used by Trustpilot. */
function trustLabel(score: number): string {
  if (score >= 4.7) return "Excellent";
  if (score >= 4.0) return "Great";
  if (score >= 3.3) return "Average";
  if (score >= 2.3) return "Poor";
  return "Bad";
}

function TrustStar({ fill }: { fill: number }) {
  const clamped = Math.max(0, Math.min(1, fill));
  return (
    <span className={styles["mm-tp-star"]} aria-hidden="true">
      {/* empty base */}
      <span className={styles["mm-tp-star-bg"]}>
        <Star size={12} strokeWidth={0} fill="currentColor" />
      </span>
      {/* fractional fill, clipped left-to-right */}
      {clamped > 0 && (
        <span
          className={styles["mm-tp-star-fill"]}
          style={{ width: `${clamped * 100}%` }}
        >
          <Star size={12} strokeWidth={0} fill="currentColor" />
        </span>
      )}
    </span>
  );
}

const TrustpilotBar = () => {
  const [live, setLive] = useState<{
    rating: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trustpilot")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (
          !cancelled &&
          typeof data?.rating === "number" &&
          typeof data?.count === "number" &&
          data.rating > 0 &&
          data.count > 0
        ) {
          setLive({ rating: data.rating, count: data.count });
        }
      })
      .catch(() => {
        /* API unavailable — keep showing the fallback values */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fallback (SSR / first paint) for the stripe; replaced by live data if valid.
  const rating = Math.round((live?.rating ?? FALLBACK_RATING) * 10) / 10;
  const count = live?.count ?? FALLBACK_REVIEW_COUNT;
  const label = trustLabel(rating);

  return (
    <div className={styles["mm-trustbar-wrap"]}>
      <a
        className={styles["mm-trustbar"]}
        href={TRUSTPILOT_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={`Read our ${label} reviews on Trustpilot`}
      >
        <span className={styles["mm-trustbar-brand"]}>
          <span className={styles["mm-tp-mark"]} aria-hidden="true">
            <Star size={11} strokeWidth={0} fill="currentColor" />
          </span>
          Trustpilot
        </span>

        <span className={styles["mm-trustbar-divider"]} aria-hidden="true" />

        <span
          className={styles["mm-trustbar-stars"]}
          role="img"
          aria-label={`Rated ${rating.toFixed(1)} out of 5`}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <TrustStar key={i} fill={rating - (i - 1)} />
          ))}
        </span>

        <strong className={styles["mm-trustbar-score"]}>
          {rating.toFixed(1)}
        </strong>
        <span className={styles["mm-trustbar-label"]}>{label}</span>
        <span className={styles["mm-trustbar-count"]}>
          Based on {count.toLocaleString("en-US")} reviews
        </span>
      </a>
    </div>
  );
};

export default TrustpilotBar;
