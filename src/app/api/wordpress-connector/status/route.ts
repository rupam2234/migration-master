import { hashWordPressConnectorToken, pool } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      { message: "token is required" },
      { status: 400 },
    );
  }

  const tokenHash = hashWordPressConnectorToken(token);

    const result = await pool.query(
    `
      SELECT project_name, source_status, source_address, source_credentials, metadata
      FROM migration_connections
      WHERE source_platform = 'WordPress'
        AND destination_platform = 'Shopify'
        AND COALESCE(source_credentials->>'connectorTokenHash', '') = $1
      LIMIT 1
    `,
    [tokenHash],
  );

  const project = result?.[0];

  if (!project) {
    return NextResponse.json(
      { message: "Connector token not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      project_name: project.project_name,
      source_status: project.source_status,
      source_address: project.source_address,
      connector: project.source_credentials ?? null,
      metadata: project.metadata ?? null,
    },
    { status: 200 },
  );
}
