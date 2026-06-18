import { generateWXR, WXRConfig } from "@/lib/wxr_generator";
import { NextRequest, NextResponse } from "next/server";
import { Resurces } from "../fetch/route";

const WXR_RESOURCES: Resurces[] = ["images", "blogs", "articles", "pages"];

const FILENAME_MAP: Record<Resurces, string> = {
    images: "shopify-media.xml",
    blogs: "shopify-categories.xml",
    articles: "shopify-posts.xml",
    pages: "shopify-pages.xml",
    orders: "shopify-orders.xml",
    single_article: "shopify-single.xml"
}; // for wordpress

export interface ExportProps {
    data: any;
}

export async function POST(req: NextRequest, { params }: { params: { resources: Resurces } }) {
    const { resources } = params;

    if (!WXR_RESOURCES.includes(resources as Resurces)) {
        return NextResponse.json(
            { message: `WXR export not supported for "${resources}". Supported: ${WXR_RESOURCES.join(", ")}` },
            { status: 400 }
        );
    }

    const shopDomain = req.nextUrl.searchParams.get("shop");
    if (!shopDomain) {
        return NextResponse.json(
            { message: "Missing shop parameter" },
            { status: 400 }
        );
    }

    const wpSite = req.nextUrl.searchParams.get("wp_site");
    if (!wpSite) {
        return NextResponse.json(
            { message: "Missing WordPress site parameter" },
            { status: 400 }
        );
    }

    try {

        const { data }: ExportProps = await req.json();

        if (!data) {
            return NextResponse.json({ message: "Missing data" }, { status: 400 });
        }

        if (!Array.isArray(data)) {
            return NextResponse.json({ message: "data must be an array" }, { status: 400 });
        }

        const cfg: WXRConfig = {
            siteUrl: wpSite,
            defaultAuthor: "admin",
        };

        const xml = generateWXR(resources as Resurces, data, cfg);
        const filename = FILENAME_MAP[resources as Resurces];

        return new NextResponse(xml, {
            status: 200,
            headers: {
                "Content-Type": "application/xml; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
    }

}