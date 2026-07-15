import { NextRequest, NextResponse } from "next/server";
import { encryptToken, pool } from "@/lib";

export async function POST(req: NextRequest) {
    const secret = req.headers.get("x-connector-secret");

    if (secret !== process.env.CONNECTOR_SECRET) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const {
            userId,
            shopDomain,
            accessToken,
        } = await req.json();

        if (!userId || !shopDomain || !accessToken) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const encryptedToken = encryptToken(accessToken);

        await pool.query(
            `
                INSERT INTO shopify_connections
                (
                    id,
                    user_id,
                    shop_domain,
                    encrypted_access_token,
                    status,
                    installed_at,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    gen_random_uuid(),
                    $1,
                    $2,
                    $3,
                    'CONNECTED',
                    NOW(),
                    NOW(),
                    NOW()
                )
                ON CONFLICT (shop_domain)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    encrypted_access_token = EXCLUDED.encrypted_access_token,
                    status = 'CONNECTED',
                    updated_at = NOW()
            `,
            [
                userId,
                shopDomain,
                encryptedToken,
            ]
        );

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        return NextResponse.json(
            {
                message: "Failed to save Shopify connection",
            },
            {
                status: 500,
            }
        );
    }
}