import { hashWordPressConnectorToken, pool } from "@/lib";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type ConnectorConnectBody = {
  token?: string;
  site_url?: string;
  site_name?: string;
  rest_url?: string;
  admin_url?: string;
  wp_version?: string;
  plugin_version?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ConnectorConnectBody | null;
  const token = body?.token?.trim();
  const siteUrl = normalizeMaybeUrl(body?.site_url);

  if (!token || !siteUrl) {
    return NextResponse.json(
      { message: "token and site_url are required" },
      { status: 400 },
    );
  }

  const tokenHash = hashWordPressConnectorToken(token);

  try {
    const rows = await pool.query(
      `
      SELECT id, project_name, source_credentials, metadata
      FROM migration_connections
      WHERE source_platform = 'WordPress'
        AND destination_platform = 'Shopify'
        AND COALESCE(source_credentials->>'connectorTokenHash', '') = $1
      LIMIT 1
      `,
      [tokenHash],
    );

    const project = rows?.[0];

    if (!project?.id) {
      return NextResponse.json(
        { message: "Connector token not found" },
        { status: 404 },
      );
    }

    const updatedCredentials = {
      ...(project.source_credentials ?? {}),
      connectorTokenHash: tokenHash,
      connectorState: "CONNECTED",
      connectedAt: new Date().toISOString(),
      siteUrl,
      siteName: body?.site_name?.trim() || null,
      restUrl: normalizeMaybeUrl(body?.rest_url),
      adminUrl: normalizeMaybeUrl(body?.admin_url),
      wpVersion: body?.wp_version?.trim() || null,
      pluginVersion: body?.plugin_version?.trim() || null,
    };

    const updatedMetadata = {
      ...(project.metadata ?? {}),
      connector: {
        state: "CONNECTED",
        connectedAt: new Date().toISOString(),
        siteUrl,
        siteName: body?.site_name?.trim() || null,
        wpVersion: body?.wp_version?.trim() || null,
        pluginVersion: body?.plugin_version?.trim() || null,
      },
    };

    const updated = await pool.query(
      `
        UPDATE migration_connections
        SET source_status = 'CONNECTED',
            source_address = COALESCE(NULLIF($2, ''), source_address),
            source_credentials = $3,
            metadata = $4,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [project.id, siteUrl, updatedCredentials, updatedMetadata],
    );

    revalidateTag("user-projects");

    return NextResponse.json(
      {
        message: "Connector linked successfully",
        project: updated?.[0] ?? null,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { message: error?.message || "Failed to link connector" },
      { status: 500 },
    );
  }
}

function normalizeMaybeUrl(value?: string | null) {
  if (!value) return null;

  return value.trim().replace(/\/$/, "");
}
