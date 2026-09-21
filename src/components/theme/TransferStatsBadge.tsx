import { useEffect, useRef, useState } from "react";
import styles from "@/app/(home)/style.module.css";

export interface SiteStats {
  projects: number;
  transfers: number;
}

function useCountUp(target: number | null, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const start = performance.now();

    function tick(now: number) {
      if (target === null) return;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}

type Status = "loading" | "error" | "ready";

interface TransferStatsBadgeProps {
  /** Server-fetched stats (home page ISR). When present, the client fetch is skipped. */
  initial?: SiteStats;
}

export default function TransferStatsBadge({
  initial,
}: TransferStatsBadgeProps) {
  const [stats, setStats] = useState<SiteStats | null>(initial ?? null);
  const [status, setStatus] = useState<Status>(
    initial ? "ready" : "loading",
  );

  useEffect(() => {
    // Server already delivered stats — no need for a client round-trip.
    if (initial) return;

    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
        } else {
          setStats({ projects: data.projects, transfers: data.transfers });
          setStatus("ready");
        }
      })
      .catch(() => setStatus("error"));
  }, [initial]);

  const transfers = useCountUp(stats?.transfers ?? null);
  const projects = useCountUp(stats?.projects ?? null);

  return (
    <div className={styles.mmBadge}>
      <div className={styles.mmBadgeStack}>
        {/* Loading layer */}
        <div
          className={styles.mmBadgeLayer}
          data-visible={status === "loading"}
        >
          <span className={styles.mmBadgeSkeleton} />
        </div>

        {/* Error layer */}
        <div className={styles.mmBadgeLayer} data-visible={status === "error"}>
          <span
            className={styles.mmBadgeDot}
            data-state="off"
            aria-hidden="true"
          />
          <span className={styles.mmBadgeMuted}>Stats unavailable</span>
        </div>

        {/* Ready layer */}
        <div
          className={styles.mmBadgeLayer}
          data-visible={status === "ready"}
          role="status"
        >
          <span
            className={styles.mmBadgeDot}
            data-state="on"
            aria-hidden="true"
          />
          <span className={styles.mmBadgeValue}>
            {transfers.toLocaleString()}
          </span>
          <span className={styles.mmBadgeLabel}>transfers completed</span>
          {/* <span className={styles.mmBadgeDivider} aria-hidden="true" /> */}{" "}
          <span className={styles.mmBadgeLabel}>accross</span>
          <span className={styles.mmBadgeValue}>
            {projects.toLocaleString()}
          </span>
          <span className={styles.mmBadgeLabel}>projects</span>
        </div>
      </div>
    </div>
  );
}
