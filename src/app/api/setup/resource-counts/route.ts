import { NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * Manual (idempotent) setup for the estimator tables, mirroring
 * `db/migrations/003_resource_counts.sql` + `004_estimate_snapshots.sql`.
 * `npm run db:migrate` applies the same statements; this endpoint exists so a
 * fresh environment can be provisioned without shell access.
 *
 * Statements run one at a time because the Neon HTTP driver takes a single
 * statement per query.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS resource_counts (
     project TEXT NOT NULL,
     resource TEXT NOT NULL,
     count INTEGER,
     direction TEXT,
     status TEXT NOT NULL DEFAULT 'OK',
     reason TEXT,
     fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (project, resource)
   )`,
  `ALTER TABLE resource_counts ADD COLUMN IF NOT EXISTS direction TEXT`,
  `ALTER TABLE resource_counts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'OK'`,
  `ALTER TABLE resource_counts ADD COLUMN IF NOT EXISTS reason TEXT`,
  `CREATE TABLE IF NOT EXISTS estimate_runs (
     project TEXT PRIMARY KEY,
     direction TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'RUNNING',
     started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     completed_at TIMESTAMPTZ,
     total_credits BIGINT,
     error TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS idx_resource_counts_fetched_at
     ON resource_counts (fetched_at)`,
];

export async function POST() {
  try {
    for (const statement of STATEMENTS) {
      await pool.query(statement);
    }

    return NextResponse.json({
      message: "Estimator tables ready",
      statements: STATEMENTS.length,
    });
  } catch (error) {
    console.error("Error creating estimator tables:", error);
    return NextResponse.json(
      { message: "Failed to create tables", error: (error as Error).message },
      { status: 500 }
    );
  }
}
