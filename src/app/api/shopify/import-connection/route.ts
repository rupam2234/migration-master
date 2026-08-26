import { getCurrentUser, pool } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_CONNECTOR_AUTH_URL =
  "https://shopify.migrationmaster.online/auth/start";

export async function GET(req: NextRequest) {
  const projectName = req.nextUrl.searchParams.get("project");

  if (!projectName) {
    return NextResponse.json(
      { message: "Missing project parameter" },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          id,
          project_name,
          source_platform,
          destination_platform,
          destination_address,
          destination_status,
          destination_credentials
        FROM migration_connections
        WHERE project_name = $1
          AND user_id = $2
          AND destination_platform = 'Shopify'
        LIMIT 1
      `,
      [projectName, user.id],
    );

    const project = result?.[0];

    if (!project) {
      return NextResponse.json(
        { message: "Project connection not found" },
        { status: 404 },
      );
    }

    const connected = project.destination_status === "CONNECTED";

    // Diagnostics only (never a secret value): lets the dashboard tell
    // "waiting for merchant approval" apart from "channel not provisioned".
    const credentials =
      project.destination_credentials &&
      typeof project.destination_credentials === "object"
        ? (project.destination_credentials as Record<string, unknown>)
        : null;
    const channelProvisioned = Boolean(credentials?.channelSecret);

    // Values are embedded verbatim: the Shopify connector validates
    // shop === destination_address and connectionId === migration_connections.id
    // before starting OAuth. Once connected, re-initiating would be rejected
    // ("Invalid or expired connection"), so no connectUrl is returned.
    let connectUrl: string | null = null;

    if (!connected && project.id && project.destination_address) {
      const url = new URL(SHOPIFY_CONNECTOR_AUTH_URL);
      url.searchParams.set("shop", project.destination_address);
      url.searchParams.set("connectionId", project.id);
      connectUrl = url.toString();
    }

    return NextResponse.json({
      id: project.id,
      projectName: project.project_name,
      shopDomain: project.destination_address,
      status: project.destination_status,
      connected,
      channelProvisioned,
      connectUrl,
      ...(connected
        ? { credentials: sanitizeCredentials(project.destination_credentials) }
        : {}),
    });
  } catch (error: any) {
    console.error("Error resolving Shopify import connection:", error);
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// destination_credentials may hold secrets (e.g. channelSecret reserved for
// the Phase 1b HMAC middleware); never expose those to the browser.
function sanitizeCredentials(credentials: Record<string, unknown> | null) {
  if (!credentials || typeof credentials !== "object") return null;

  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (/secret|token|password|hmac/i.test(key)) continue;
    safe[key] = value;
  }

  return safe;
}