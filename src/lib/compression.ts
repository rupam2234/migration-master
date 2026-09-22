/**
 * Shared gzip helpers for data that round-trips through Postgres.
 *
 * Text columns (rather than `bytea`) are deliberate: the Neon HTTP driver
 * handles plain base64 strings without extra casting, and this matches the
 * existing `export_job_batches` / `export_job_parts` convention.
 *
 * These are the ONLY functions to touch when snapshots/artifacts move to
 * object storage (R2/S3) — nothing else knows how bytes are stored.
 */
import { gzipSync, gunzipSync } from "node:zlib";

/** gzip a UTF-8 string and encode it as base64. */
export function gzipToBase64(input: string): string {
  return gzipSync(Buffer.from(input, "utf8")).toString("base64");
}

/** Decode a base64 gzip payload back to a UTF-8 string. */
export function gunzipToString(payload: string): string {
  return gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
}

/** Decode a base64 gzip payload straight to a parsed JSON value. */
export function gunzipToJson<T>(payload: string): T {
  return JSON.parse(gunzipToString(payload)) as T;
}
