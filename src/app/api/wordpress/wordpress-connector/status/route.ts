import { pool } from "@/lib";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

async function getMigrationConnection(site: string) {
  const result = await pool.query(
    `
      SELECT source_status, destination_status
      FROM migration_connections
      WHERE source_platform = 'WordPress'
        AND destination_platform = 'Shopify'
        AND project_name = $1
      LIMIT 1
    `,
    [site],
  );

  return result?.[0] ?? null;
}

export async function GET(req: NextRequest) {
  const site = req.headers.get("x-site");

  if (!site) {
    return NextResponse.json(
      { message: "Missing x-site header" },
      { status: 400 },
    );
  }

  const getCachedConnection = unstable_cache(
    () => getMigrationConnection(site),
    ["migration-connection", site],
    {
      revalidate: 60 * 60,
    },
  );

  const data = await getCachedConnection();

  if (!data) {
    return NextResponse.json(
      { message: "Connection not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      source_status: data.source_status === "CONNECTED",
      destination_status: data.destination_status === "CONNECTED",
    },
    { status: 200 },
  );
}