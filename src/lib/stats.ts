import { pool } from "@/lib";
import { unstable_cache } from "next/cache";

export interface SiteStats {
  projects: number;
  transfers: number;
}

/**
 * Cached (10 min) so server rendering the homepage doesn't hit Postgres
 * on every request. Returns null when the queries fail — callers decide
 * how to degrade (API route → 500, badge → client-side retry).
 */
export const getSiteStats = unstable_cache(
  async (): Promise<SiteStats | null> => {
    try {
      // Total number of migration projects (export jobs)
      const projectsResult = await pool.query(
        `SELECT COUNT(*) AS projects FROM export_jobs`,
      );
      const { projects } = projectsResult[0] || { projects: 0 };

      // Total number of transferred items (exported items)
      const transfersResult = await pool.query(
        `SELECT COUNT(*) AS transfers FROM exported_items`,
      );
      const { transfers } = transfersResult[0] || { transfers: 0 };

      return { projects: Number(projects), transfers: Number(transfers) };
    } catch (error) {
      console.error("Failed to fetch stats", error);
      return null;
    }
  },
  ["site-stats"],
  { revalidate: 600 },
);