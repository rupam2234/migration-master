import crypto from "node:crypto";

/**
 * Mints the reverse-migration channel secret shared between this SaaS and the
 * Shopify connector.
 *
 * Contract (REVERSE_MIGRATION_PLAN.md §Implementation Status):
 *  - Format: "mmsh_" + 32 cryptographically-random bytes, base64url encoded
 *    (48 chars total, 256-bit entropy).
 *  - Written ONLY by this SaaS into migration_connections.destination_credentials
 *    (JSONB `{ channelSecret }`) atomically with the destination row; the
 *    connector merely READS it to verify HMAC-SHA256 signatures on
 *    /api/mm/v1/* requests (Phase 1b middleware).
 *  - Opaque to consumers: never rendered in the dashboard, never returned by
 *    API routes, never emailed. Rotation is explicit (a caller may supply its
 *    own replacement channelSecret); silent rotation is forbidden because it
 *    invalidates in-flight signed imports.
 */
export function generateChannelSecret(): string {
    return `mmsh_${crypto.randomBytes(32).toString("base64url")}`;
}
