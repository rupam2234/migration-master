import {
    buildWordPressConnectorCredentials,
    generateWordPressConnectorToken,
    getCurrentUser,
    isWordPressToShopifyFlow,
    pool,
    WXRConfig,
} from "@/lib";
import { generateChannelSecret } from "@/lib/channel-secret";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Reverse-flow credential stewarding. The SaaS is the SOLE writer of
 * migration_connections.destination_* state (see REVERSE_MIGRATION_PLAN.md,
 * Implementation Status §Step 1 shared-database design):
 *
 *  WHO mints the channel secret: this handler, running under an
 *      authenticated dashboard session — the only code path that inserts
 *      migration_connections rows.
 *  WHEN: at first insert of a destination_platform='Shopify' row; preserved
 *      untouched afterwards; lazily backfilled if a legacy row lacks one;
 *      regenerated only when a caller explicitly supplies its own
 *      destination_credentials.channelSecret (deliberate rotation).
 *
 * Rotation must stay explicit: silent rotation would invalidate in-flight
 * HMAC-signed /api/mm/v1 imports once Phase 1b verification ships.
 */

/** Never echo credential-ish fields back to the browser. */
const SENSITIVE_KEY_RE = /secret|token|password|hmac/i;

/**
 * Strips credentials from Prisma-style RETURNING rows so responses to the
 * dashboard never contain the channel secret nor the WordPress connector
 * token inside metadata.
 */
function sanitizeProjectRows(rows: unknown): unknown {
    if (!Array.isArray(rows)) return rows;

    return rows.map((row) => {
        if (!row || typeof row !== "object") return row;

        const clone: Record<string, unknown> = { ...(row as Record<string, unknown>) };

        delete clone.source_credentials;
        delete clone.destination_credentials;

        if (clone.metadata && typeof clone.metadata === "object") {
            const meta = { ...(clone.metadata as Record<string, unknown>) };

            if (meta.connector && typeof meta.connector === "object") {
                const conn = { ...(meta.connector as Record<string, unknown>) };
                delete conn.token;
                meta.connector = conn;
            }

            clone.metadata = meta;
        }

        // Defense-in-depth: drop any other sensitive-looking keys.
        for (const key of Object.keys(clone)) {
            if (SENSITIVE_KEY_RE.test(key)) delete clone[key];
        }

        return clone;
    });
}

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
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
    }

    if (body?.project_name) {
        return createMigrationProject(body as MigrationProjectProps, user.id, origin);
    }

    // const { shopify_domain, wp_settings }: WPSettingsProps = body;
    // const { siteUrl, defaultAuthor = "admin", wxrVersion = "1.2" } = wp_settings;

    // if (!siteUrl || !shopify_domain) {
    //     return NextResponse.json({ message: "Bad request" }, { status: 400 });
    // }

    // try {
    //     const result = await pool.query(
    //         `SELECT id from shop_credentials where shop_domain = $1`,
    //         [shopify_domain],
    //     );

    //     if (!result[0].id) {
    //         return NextResponse.json({ message: "Shop not found" }, { status: 404 });
    //     }

    //     const insertWpSettings = await pool.query(
    //         `
    //         INSERT INTO wp_import_config (
    //             shop_id,
    //             wp_site_url,
    //             default_author,
    //             wxr_version
    //         )
    //         VALUES ($1, $2, $3, $4)
    //         ON CONFLICT (shop_id)
    //         DO UPDATE SET
    //             wp_site_url = EXCLUDED.wp_site_url,
    //             default_author = EXCLUDED.default_author,
    //             wxr_version = EXCLUDED.wxr_version
    //         RETURNING *;
    //         `,
    //         [
    //             result[0].id,
    //             siteUrl,
    //             defaultAuthor,
    //             wxrVersion,
    //         ],
    //     );

    //     return NextResponse.json({ insertWpSettings }, { status: 201 });
    // } catch (error: any) {
    //     console.log(error);
    //     return NextResponse.json({ message: "Something went wong" }, { status: 500 });
    // }
}

async function createMigrationProject(
    payload: MigrationProjectProps,
    userId: string,
    origin: string,
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

    const isWordPressSourceProject = isWordPressToShopifyFlow(
        source_platform,
        destination_platform,
    );

    const connectorToken = isWordPressSourceProject
        ? generateWordPressConnectorToken()
        : null;

    const connectorCredentials = connectorToken
        ? {
            ...(source_credentials ?? {}),
            ...buildWordPressConnectorCredentials(connectorToken),
            connectorToken,
        }
        : source_credentials;

    const effectiveSourceStatus =
        isWordPressSourceProject && source_status === "PENDING"
            ? "PENDING_CONNECTOR"
            : source_status;

    try {
        // Reverse-channel credential stewarding (see header docs):
        // merge any caller-provided destination credentials over the stored
        // ones, minting a channelSecret when none exists yet.
        let outboundDestinationCredentials = destination_credentials;
        let effectiveDestinationStatus = destination_status;

        if (destination_platform?.trim().toLowerCase() === "shopify") {
            const existingRows = await pool.query(
                `
                SELECT destination_status, destination_credentials
                FROM migration_connections
                WHERE user_id = $1 AND project_name = $2
                LIMIT 1
            `,
                [userId, project_name.trim()],
            );

            const existing = existingRows?.[0];

            if (effectiveDestinationStatus === "PENDING" && existing?.destination_status === "CONNECTED") {
                // Idempotent wizard re-save must never silently un-connect.
                effectiveDestinationStatus = "CONNECTED";
            }

            const storedCreds =
                existing?.destination_credentials &&
                typeof existing.destination_credentials === "object"
                    ? (existing.destination_credentials as Record<string, unknown>)
                    : {};

            const mergedCreds: Record<string, unknown> = {
                ...storedCreds,
                ...(destination_credentials ?? {}),
            };

            if (!mergedCreds.channelSecret) {
                mergedCreds.channelSecret = generateChannelSecret();
                console.log(
                    `[wp-settings] minted channelSecret for ${project_name.trim()} (${existing ? "backfill" : "create"})`,
                );
            }

            outboundDestinationCredentials = mergedCreds;
        }

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
                -- Preserve stored credentials when the caller did not send
                -- replacements. Re-saving a project from the new-project
                -- wizard must never wipe destination_credentials.channelSecret
                -- (kills the reverse-flow connect guard) nor the WordPress
                -- connector token of an already-connected source.
                source_credentials = COALESCE(
                    EXCLUDED.source_credentials,
                    migration_connections.source_credentials
                ),
                destination_credentials = COALESCE(
                    EXCLUDED.destination_credentials,
                    migration_connections.destination_credentials
                ),
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
                effectiveSourceStatus,
                effectiveDestinationStatus,
                connectorCredentials,
                outboundDestinationCredentials,
                {
                    project_name: project_name.trim(),
                    source_platform: source_platform.trim(),
                    destination_platform: destination_platform.trim(),
                    source_address: source_address.trim(),
                    destination_address: destination_address.trim(),
                    source_status: effectiveSourceStatus,
                    destination_status,
                    connector: connectorToken
                        ? {
                            required: true,
                            state: "PENDING_CONNECTOR",
                            token: connectorToken,
                        }
                        : null,
                    settings,
                },
            ],
        );

        revalidateTag("user-projects");

        return NextResponse.json(
            {
                insertMigrationProject: sanitizeProjectRows(result),
                connector: connectorToken
                    ? {
                        token: connectorToken,
                        downloadUrl: origin
                            ? `/api/wordpress/wordpress-connector/download?token=${encodeURIComponent(
                                connectorToken,
                            )}&appUrl=${encodeURIComponent(origin)}&projectName=${encodeURIComponent(
                                project_name.trim(),
                            )}`
                            : "/wordpress-source-connector.zip",
                        pluginName: "Migration Master Connector",
                    }
                    : null,
            },
            { status: 201 },
        );
    } catch (error: any) {
        // console.log(error);
        return NextResponse.json(
            { message: error?.message || "Failed to save migration project" },
            { status: 500 },
        );
    }
}
