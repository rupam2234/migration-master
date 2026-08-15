import { getCurrentUser, pool, WXRConfig } from "@/lib";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export interface WPSettingsProps {
    wp_settings: WXRConfig;
    shopify_domain: string | null;
}

export interface MigrationProjectProps {
    project_name: string;
    source_platform: string;
    destination_platform: string;
    source_address: string;
    destination_address: string;
    source_status?: string;
    destination_status?: string;
    source_credentials?: Record<string, unknown> | null;
    destination_credentials?: Record<string, unknown> | null;
    settings?: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
    const body = await req.json();

    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
    }

    if (body?.project_name) {
        return createMigrationProject(body as MigrationProjectProps, user.id);
    }

    const { shopify_domain, wp_settings }: WPSettingsProps = body;
    const { siteUrl, defaultAuthor = "admin", wxrVersion = "1.2" } = wp_settings;

    if (!siteUrl || !shopify_domain) {
        return NextResponse.json({ message: "Bad request" }, { status: 400 });
    }

    try {
        const result = await pool.query(
            `SELECT id from shop_credentials where shop_domain = $1`,
            [shopify_domain],
        );

        if (!result[0].id) {
            return NextResponse.json({ message: "Shop not found" }, { status: 404 });
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
            ],
        );

        return NextResponse.json({ insertWpSettings }, { status: 201 });
    } catch (error: any) {
        console.log(error);
        return NextResponse.json({ message: "Something went wong" }, { status: 500 });
    }
}

async function createMigrationProject(
    payload: MigrationProjectProps,
    userId: string,
) {
    const {
        project_name,
        source_platform,
        destination_platform,
        source_address,
        destination_address,
        source_status = "PENDING",
        destination_status = "PENDING",
        source_credentials = null,
        destination_credentials = null,
        settings = null,
    } = payload;

    if (
        !project_name?.trim() ||
        !source_platform?.trim() ||
        !destination_platform?.trim() ||
        !source_address?.trim() ||
        !destination_address?.trim()
    ) {
        return NextResponse.json(
            {
                message:
                    "project_name, source_platform, destination_platform, source_address, and destination_address are required",
            },
            { status: 400 },
        );
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO migration_connections (
                user_id,
                project_name,
                source_platform,
                destination_platform,
                source_address,
                destination_address,
                source_status,
                destination_status,
                source_credentials,
                destination_credentials,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (user_id, project_name)
            DO UPDATE SET
                source_platform = EXCLUDED.source_platform,
                destination_platform = EXCLUDED.destination_platform,
                source_address = EXCLUDED.source_address,
                destination_address = EXCLUDED.destination_address,
                source_status = EXCLUDED.source_status,
                destination_status = EXCLUDED.destination_status,
                source_credentials = EXCLUDED.source_credentials,
                destination_credentials = EXCLUDED.destination_credentials,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING *;
            `,
            [
                userId,
                project_name.trim(),
                source_platform.trim(),
                destination_platform.trim(),
                source_address.trim(),
                destination_address.trim(),
                source_status,
                destination_status,
                source_credentials,
                destination_credentials,
                {
                    project_name: project_name.trim(),
                    source_platform: source_platform.trim(),
                    destination_platform: destination_platform.trim(),
                    source_address: source_address.trim(),
                    destination_address: destination_address.trim(),
                    source_status,
                    destination_status,
                    settings,
                },
            ],
        );

        revalidateTag("user-projects");

        return NextResponse.json({ insertMigrationProject: result }, { status: 201 });
    } catch (error: any) {
        console.log(error);
        return NextResponse.json(
            { message: error?.message || "Failed to save migration project" },
            { status: 500 },
        );
    }
}
