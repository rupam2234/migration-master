import { getCurrentUser, pool, WXRConfig } from "@/lib";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {

    const domain = req.headers.get("domain")

    if (!domain) {
        return NextResponse.json({ message: "Shopify domain missing" }, { status: 400 })
    }

    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ message: "User unauthorized" }, { status: 401 })
        }

        const data = await getWpSettings(domain)

        return NextResponse.json({ data }, { status: 200 })

    } catch (error) {
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
    }
}

const getWpSettings = unstable_cache(
    async (domain: string): Promise<WXRConfig> => {
        const shop = await pool.query(
            `select id from shop_credentials where shop_domain = $1`,
            [domain]
        );

        const result = await pool.query(
            `select wp_site_url, default_author, wxr_version
         from wp_import_config
         where shop_id = $1`,
            [shop[0].id]
        );

        return {
            siteUrl: result[0].wp_site_url,
            defaultAuthor: result[0].default_author,
            wxrVersion: result[0].wxr_version,
        };
    },
    ["wp-settings"],
    {
        revalidate: 3600,
    }
);