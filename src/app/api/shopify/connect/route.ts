import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, pool } from "@/lib";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 },
        );
    }

    const shop = req.nextUrl.searchParams.get("shop");

    if (!shop) {
        return NextResponse.json(
            { message: "Shop domain is required" },
            { status: 400 },
        );
    }

    const normalizedShop = shop
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .trim()
        .toLowerCase();

    if (!normalizedShop.endsWith(".myshopify.com")) {
        return NextResponse.json(
            { message: "Invalid Shopify domain" },
            { status: 400 },
        );
    }

    const connectionId = randomUUID();

    await pool.query(
        `
    INSERT INTO shopify_connections
    (
      id,
      user_id,
      shop_domain,
      connection_id,
      status,
      created_at,
      updated_at
    )
    VALUES
    (
      gen_random_uuid(),
      $1,
      $2,
      $3,
      'PENDING',
      NOW(),
      NOW()
    )
    ON CONFLICT (shop_domain)
    DO UPDATE SET
      connection_id = EXCLUDED.connection_id,
      status = 'PENDING',
      updated_at = NOW()
    `,
        [
            user.id,
            normalizedShop,
            connectionId,
        ],
    );

    const connectorUrl = new URL(
        "https://shopify.migrationmaster.online/auth/start",
    );

    connectorUrl.searchParams.set("shop", normalizedShop);
    connectorUrl.searchParams.set("connectionId", connectionId);

    return NextResponse.redirect(connectorUrl);
}