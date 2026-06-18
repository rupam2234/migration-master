import { getCurrentUser, pool, WXRConfig } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

export interface WPSettingsProps {
    wp_settings: WXRConfig;
    shopify_domain: string | null
}

export async function POST(req: NextRequest) {
    const { shopify_domain, wp_settings }: WPSettingsProps = await req.json();

    const { siteUrl, defaultAuthor = "admin", wxrVersion = "1.2" } = wp_settings

    if (!siteUrl || !shopify_domain) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 })
    }

    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
    }


    try {
        const result = await pool.query(`SELECT id from shop_credentials where shop_domain = $1`, [shopify_domain]);

        if (!result[0].id) {
            return NextResponse.json({ message: "Shop not found" }, { status: 404 })
        }

        const insertWpSettings = await pool.query(
            `
            INSERT INTO wp_import_config (
                shop_id,
                wp_site_url,
                default_author,
                wxr_version
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (shop_id)
            DO UPDATE SET
                wp_site_url = EXCLUDED.wp_site_url,
                default_author = EXCLUDED.default_author,
                wxr_version = EXCLUDED.wxr_version
            RETURNING *;
            `,
            [
                result[0].id,
                siteUrl,
                defaultAuthor,
                wxrVersion,
            ]
        );

        return NextResponse.json({ insertWpSettings }, { status: 201 })
    } catch (error: any) {
        console.log(error)
        return NextResponse.json({ message: "Something went wong" }, { status: 500 })
    }

}