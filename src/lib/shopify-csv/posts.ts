import {
  isPublished,
  pick,
  stripHtml,
  stripImageProxy,
  toCsv,
  toHandle,
  toTagList,
  decodeEntities,
} from "./csv-utils";
import { collectMetafieldHeaders, metafieldColumns, seoColumns } from "./metafields";

/**
 * WordPress posts → Shopify blog posts CSV.
 *
 * Shopify has NO native blog-post importer — its official CSV only covers
 * products/customers. This mapper therefore emits the de-facto standard
 * "Blog Posts" CSV format (same headers Matrixify/Excelify import), so
 * merchants can either import it with that app or with our connector.
 *
 * Mapping summary:
 * - `title.rendered` (REST) or `title` (MMC) → `Title`
 * - `content.rendered`/`content` → `Body HTML`
 * - All posts land in the merchant's default `News` blog unless the record
 *   already names one — Shopify requires posts to belong to a blog
 * - WP categories on a post → `Tags` (Shopify blog posts tag by string list)
 * - Featured image → `Image Src`; Yoast/RankMath metas → SEO columns
 * - WP meta → `Metafield: …` columns (same rules as products)
 */
export function blogPostsCsv(items: Array<Record<string, unknown>>): string {
  const metaHeaders = collectMetafieldHeaders(items);

  const headers = [
    "Blog",
    "Title",
    "Body HTML",
    "Author",
    "Tags",
    "Published",
    "Published At",
    "Summary",
    "Image Src",
    "SEO Title",
    "SEO Description",
    ...metaHeaders,
  ];

  const rows: unknown[][] = [];

  for (const item of items) {
    const title = readRendered(item, "title");
    const body = readRendered(item, "content") ?? readRendered(item, "body");
    const tags = toTagList(
      pick(item, "tags") ?? pick(item, "categories") ?? [],
    );
    const published = isPublished(item, "status");
    const publishedAt = String(pick(item, "date", "date_gmt", "published_at") ?? "");
    const summary = stripHtml(readRendered(item, "excerpt") || body).slice(0, 300);
    const featured = String(pick(item, "featured_image", "featured_media_url") ?? "");

    const row: unknown[] = [
      String(pick(item, "blog", "blog_name") ?? "News"),
      title,
      body,
      String(pick(item, "author_name", "author") ?? ""),
      tags,
      published ? "TRUE" : "FALSE",
      publishedAt,
      summary,
      stripImageProxy(featured),
    ];

    const extras = [...seoColumns(item), ...metafieldColumns(item)];
    // Skip seo.* metafields when the native SEO columns already carry the
    // same values — shipping both is duplication in the merchant's store.
    const hasSeoColumns = extras.some((e) => e.column.startsWith("SEO "));
    for (const extra of extras) {
      if (hasSeoColumns && extra.column.startsWith("Metafield: seo.")) continue;
      const position = headers.indexOf(extra.column);
      if (position >= 0) row[position] = extra.value;
    }

    rows.push(row);
  }

  return toCsv(headers, rows);
}

/** Reads REST-shaped (`{ raw | rendered }`) or plain scalar text fields. */
function readRendered(item: Record<string, unknown>, field: string): string {
  const value = item[field];

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const shaped = value as Record<string, unknown>;
    return decodeEntities(String(shaped.rendered ?? shaped.raw ?? ""));
  }

  return decodeEntities(String(value ?? ""));
}

/**
 * WordPress categories → Shopify collections CSV (Matrixify-compatible).
 *
 * WP categories have no 1:1 Shopify native target. The closest storefront
 * concept is a Collection; each category becomes a custom collection that
 * merchants can populate by rules (or our connector can tag-match products).
 * Parent/child hierarchy is flattened — Shopify collections are flat.
 */
export function categoriesCsv(items: Array<Record<string, unknown>>): string {
  const headers = [
    "Handle",
    "Title",
    "Body HTML",
    "Published",
    "Published At",
    "Image Src",
    "SEO Title",
    "SEO Description",
  ];

  const rows = items.map((item) => {
    const published = isPublished(item, "status", "published");

    return [
      toHandle(pick(item, "slug", "name"), "collection"),
      String(pick(item, "name", "title") ?? ""),
      String(pick(item, "description", "content") ?? ""),
      published ? "TRUE" : "FALSE",
      "",
      String(pick(item, "featured_image", "image") ?? "").replace(/\/adapt\/.*$/, ""),
      "",
      "",
    ];
  });

  return toCsv(headers, rows);
}
