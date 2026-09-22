import { pick, stripHtml } from "./csv-utils";

/**
 * Maps WordPress/WooCommerce meta values onto Shopify metafield columns.
 *
 * Shopify's product CSV importer supports metafields natively via columns
 * named `Metafield: <namespace>.<key> [<type>]`. This module is the single
 * place deciding *which* WP meta becomes a metafield and how it is named —
 * so product, post and collection mappers all stay consistent.
 */

/** Column suffix for a text metafield. */
const TEXT_FIELD = "single_line_text_field";

/**
 * Internal WP keys (leading `_`) worth carrying over, mapped to clean
 * Shopify namespaces. Everything else internal is dropped — leaking plugin
 * internals into the merchant's store is noise at best, harmful at worst.
 */
const INTERNAL_KEY_MAP: Record<string, { namespace: string; key: string }> = {
  _yoast_wpseo_title: { namespace: "seo", key: "title" },
  _yoast_wpseo_metadesc: { namespace: "seo", key: "description" },
  _yoast_wpseo_focuskw: { namespace: "seo", key: "focus_keyword" },
  _aioseop_title: { namespace: "seo", key: "title" },
  _aioseop_description: { namespace: "seo", key: "description" },
  _rank_math_title: { namespace: "seo", key: "title" },
  _rank_math_description: { namespace: "seo", key: "description" },
  external_url: { namespace: "custom", key: "external_url" },
};

/** Visible (non-`_`) keys that are migrated as-is under the `custom` ns. */
const MAX_VISIBLE_META = 25;

/**
 * Reads every meta entry of a record regardless of which shape the source
 * API produced:
 * - WooCommerce v3: `meta_data: [{ key, value }]`
 * - WP REST / MMC connector: `meta: { key: value }` (object) or array pairs
 */
function readMetaEntries(record: Record<string, unknown>): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];

  const wooMeta = record.meta_data;
  if (Array.isArray(wooMeta)) {
    for (const entry of wooMeta) {
      if (entry && typeof entry === "object" && entry.key) {
        entries.push([String(entry.key), entry.value]);
      }
    }
  }

  const restMeta = record.meta;
  if (restMeta && typeof restMeta === "object" && !Array.isArray(restMeta)) {
    for (const [key, value] of Object.entries(restMeta)) {
      entries.push([key, value]);
    }
  } else if (Array.isArray(restMeta)) {
    for (const entry of restMeta) {
      if (Array.isArray(entry) && entry.length === 2) {
        entries.push([String(entry[0]), entry[1]]);
      } else if (entry && typeof entry === "object" && (entry as any).key) {
        entries.push([String((entry as any).key), (entry as any).value]);
      }
    }
  }

  return entries;
}

/** Human-readable scalar rendering of a meta value for a text metafield. */
function renderValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    // Serialized plugin blobs are not useful in a storefront metafield.
    return null;
  }

  const text = stripHtml(value);
  return text || null;
}

/**
 * Metafield columns for a record: `[{ column, value }]`.
 *
 * - Known internal keys are remapped (Yoast → seo.*).
 * - Visible keys migrate under `custom.*`, capped to keep files sane.
 * - Duplicates collapse to their last value (matches WP behaviour).
 */
export function metafieldColumns(record: Record<string, unknown>): Array<{
  column: string;
  value: string;
}> {
  const out = new Map<string, string>();
  let visibleCount = 0;

  for (const [rawKey, rawValue] of readMetaEntries(record)) {
    const rendered = renderValue(rawValue);
    if (rendered === null) continue;

    if (rawKey.startsWith("_")) {
      const mapped = INTERNAL_KEY_MAP[rawKey];
      if (mapped) {
        out.set(`Metafield: ${mapped.namespace}.${mapped.key} [${TEXT_FIELD}]`, rendered);
      }
      continue;
    }

    if (visibleCount >= MAX_VISIBLE_META) continue;
    visibleCount += 1;

    // Flatten namespaced keys like `acf_headline` → `custom.acf_headline`.
    const safeKey = rawKey.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    out.set(`Metafield: custom.${safeKey} [${TEXT_FIELD}]`, rendered);
  }

  return Array.from(out, ([column, value]) => ({ column, value }));
}

/** Union of metafield columns across a batch, in first-seen order. */
export function collectMetafieldHeaders(items: Array<Record<string, unknown>>): string[] {
  const columns: string[] = [];

  for (const item of items) {
    for (const { column } of metafieldColumns(item)) {
      if (!columns.includes(column)) columns.push(column);
    }
  }

  return columns;
}

/**
 * SEO title/description from a record, preferring explicit fields then the
 * known Yoast/RankMath metas. Returns `[{ column, value }]` for the two
 * standard `SEO Title` / `SEO Description` columns Shopify mappers use.
 */
export function seoColumns(record: Record<string, unknown>): Array<{
  column: string;
  value: string;
}> {
  const meta = new Map(
    readMetaEntries(record).map(([key, value]) => [key, renderValue(value)]),
  );

  const yoastJson =
    typeof record.yoast_head_json === "object" && record.yoast_head_json !== null
      ? (record.yoast_head_json as Record<string, unknown>)
      : null;

  const title = String(
    pick(record, "seo_title") ??
      yoastJson?.title ??
      meta.get("_yoast_wpseo_title") ??
      meta.get("_rank_math_title") ??
      "",
  ).trim();

  const description = String(
    pick(record, "seo_description", "metadesc") ??
      yoastJson?.description ??
      meta.get("_yoast_wpseo_metadesc") ??
      meta.get("_rank_math_description") ??
      "",
  ).trim();

  const columns: Array<{ column: string; value: string }> = [];
  if (title) columns.push({ column: "SEO Title", value: title });
  if (description) columns.push({ column: "SEO Description", value: description });

  return columns;
}
