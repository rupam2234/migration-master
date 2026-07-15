import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
        );
    }

    const shop = req.nextUrl.searchParams.get("shop");

    if (!shop) {
        return NextResponse.json(
            { message: "Shop domain is required" },
            { status: 400 }
        );
    }

    const normalizedShop = shop
        .replace("https://", "")
        .replace("http://", "")
        .replace(/\/$/, "")
        .trim();


    if (!normalizedShop.endsWith(".myshopify.com")) {
        return NextResponse.json(
            { message: "Invalid Shopify domain" },
            { status: 400 }
        );
    }


    const state = Buffer.from(
        JSON.stringify({
            userId: user.id,
        })
    ).toString("base64url");


    const connectorUrl =
        new URL(
            "https://shopify.migrationmaster.online/auth/start"
        );

    connectorUrl.searchParams.set(
        "shop",
        normalizedShop
    );

    connectorUrl.searchParams.set(
        "state",
        state
    );


    return NextResponse.redirect(connectorUrl);
}