import { getCurrentUser, MMC_RESOURCES, pool, WOO_RESOURCES, WordPressResource } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

type MmcPagination = { page: number; per_page: number; total: number; total_pages?: number };
type MmcListResponse<T> = { items: T[]; pagination: MmcPagination };

const WOO_RESOURCE_SET = new Set(["products", "orders", "customers", "coupons"]);

export async function GET(req: NextRequest) {
    const projectName = req.headers.get("x-projectName");
    const resource = req.headers.get("asset") as WordPressResource;

    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!resource) {
        return NextResponse.json({ message: "Missing resource type" }, { status: 400 });
    }

    if (![...MMC_RESOURCES, ...WOO_RESOURCES].includes(resource as WordPressResource)) {
        return NextResponse.json({ message: `Unsupported resource: ${resource}` }, { status: 400 });
    }

    if (!projectName) {
        return NextResponse.json({ message: "projectName is required" }, { status: 400 });
    }

    try {
        const rows = await pool.query(`
            SELECT source_credentials FROM migration_connections WHERE project_name = $1 AND user_id = $2 
                AND source_platform = 'WordPress' AND destination_platform = 'Shopify'
                LIMIT 1
            `, [projectName, user.id]);

        const row = rows?.[0];
        const siteUrl: string | undefined = row?.source_credentials?.siteUrl;
        const domain = siteUrl?.replace(/^https?:\/\//, "");
        const token = row?.source_credentials?.connectorToken;

        if (!domain || !token) {
            return NextResponse.json({ message: "No connected WordPress site found for this project" }, { status: 404 });
        }

        if (WOO_RESOURCE_SET.has(resource)) {
            const consumerKey = row?.source_credentials?.wooConsumerKey;
            const consumerSecret = row?.source_credentials?.wooConsumerSecret;

            if (!consumerKey || !consumerSecret) {
                return NextResponse.json(
                    { message: "WooCommerce is not connected for this site yet" },
                    { status: 409 },
                );
            }

            const assetResults = await fetchWooItems(resource, domain, 50, consumerKey, consumerSecret);

            if (!assetResults) {
                return NextResponse.json({ message: "Failed to fetch assets from WooCommerce" }, { status: 400 });
            }

            return NextResponse.json(assetResults, { status: 200 });
        }

        const assetResults = await fetchItems(resource, domain, 50, token);

        if (!assetResults) {
            return NextResponse.json({ message: "Failed to fetch assets from WordPress" }, { status: 400 });
        }

        return NextResponse.json(assetResults, { status: 200 });

    } catch (error: any) {
        return NextResponse.json(
            { message: error?.message || `Failed to fetch ${resource}` },
            { status: 502 },
        );
    }
}

async function fetchItems(resource: WordPressResource, domain: string, ITEM_PER_PAGE: number = 50, token: string) {
    if (!resource || !domain) return null;

    let page_no = 1;
    let all_items: any[] = [];
    let totalPages = 1;

    const buildUrl = (page: number): string => {
        const base = `https://${domain}/wp-json`;
        switch (resource) {
            case "pages":
            case "posts":
            case "media":
                return `${base}/migration-master/v1/${resource}?page=${page}&per_page=${ITEM_PER_PAGE}`;
            case "categories":
                return `${base}/migration-master/v1/terms?taxonomy=category&page=${page}&per_page=${ITEM_PER_PAGE}`;
            default:
                throw new Error(`Unhandled resource: ${resource}`);
        }
    };

    try {
        do {
            const res = await fetch(buildUrl(page_no), {
                headers: { "X-Migration-Master-Token": token },
            });

            if (!res.ok) {
                throw new Error(`Request failed: ${res.status} ${res.statusText}`);
            }

            const data: MmcListResponse<any> = await res.json();
            all_items = all_items.concat(data.items);
            totalPages = data.pagination?.total_pages ?? 1;
            page_no++;
        } while (page_no <= totalPages);

        return all_items;
    } catch (error: any) {
        console.log(error.message);
        return null;
    }
}

async function fetchWooItems(
    resource: WordPressResource,
    domain: string,
    ITEM_PER_PAGE: number,
    consumerKey: string,
    consumerSecret: string,
) {
    let page_no = 1;
    let all_items: any[] = [];
    let totalPages = 1;

    const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
        do {
            const url = `https://${domain}/wp-json/wc/v3/${resource}?page=${page_no}&per_page=${ITEM_PER_PAGE}`;
            const res = await fetch(url, {
                headers: { Authorization: `Basic ${basicAuth}` },
            });

            if (!res.ok) {
                throw new Error(`Request failed: ${res.status} ${res.statusText}`);
            }

            const items = await res.json(); // Woo returns a bare array, not { items, pagination }
            all_items = all_items.concat(items);
            totalPages = Number(res.headers.get("X-WP-TotalPages")) || 1;
            page_no++;
        } while (page_no <= totalPages);

        return all_items;
    } catch (error: any) {
        console.log(error.message);
        return null;
    }
}