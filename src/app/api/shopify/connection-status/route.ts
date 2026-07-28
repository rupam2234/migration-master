import { getCurrentUser, pool } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const shopDomain = req.nextUrl.searchParams.get("shop");

  if (!shopDomain) {
    return NextResponse.json(
      { message: "Shop domain is required" },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `
        SELECT 
          sc.shop_domain,
          sc.status,
          sc.created_at,
          sc.updated_at,
          s."expires",
          s."refreshTokenExpires"
        FROM shopify_connections sc
        LEFT JOIN shopify."Session" s
          ON s.shop = sc.shop_domain
        WHERE sc.shop_domain = $1 AND sc.user_id = $2
      `,
      [shopDomain, user.id]
    );

    const connection = result[0];

    if (!connection) {
      return NextResponse.json(
        { message: "Project connection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      shopDomain: connection.shop_domain,
      status: connection.status ?? "CONNECTED",
      createdAt: connection.created_at,
      updatedAt: connection.updated_at,
      expiresAt: connection.expires,
      refreshTokenExpiresAt: connection.refreshTokenExpires,
    });
  } catch (error: any) {
    console.error("Error fetching connection status:", error);
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
