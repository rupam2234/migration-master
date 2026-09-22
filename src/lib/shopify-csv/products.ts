import {
  isPublished,
  pick,
  stripImageProxy,
  toCsv,
  toHandle,
  toTagList,
} from "./csv-utils";
import { collectMetafieldHeaders, metafieldColumns, seoColumns } from "./metafields";

/**
 * Shopify product-import CSV mapper.
 *
 * Target: Shopify's native "Import products" CSV (Admin → Products → Import).
 * One row per product (no complex variants — WP/Woo simple products only).
 *
 * Mapping summary:
 * - WooCommerce `name`/MMC `title` → `Title`
 * - `description`/`body_html`/`content` → `Body (HTML)`
 * - Product categories → `Tags` (Shopify has no native category import in
 *   the product CSV; tags keep products grouped and searchable on arrival)
 * - WP meta → `Metafield: … [single_line_text_field]` columns (official
 *   Shopify metafield syntax, imported natively)
 * - All images (Woo `images[]`, MMC `images[]`, `featured_image`) → one row
 *   per image position 2+, first image rides the main product row
 * - Woo stock/price fields → variant columns with the tracker/policy trio
 *   Shopify requires for managed stock
 */
export function productsCsv(items: Array<Record<string, unknown>>): string {
  const metaHeaders = collectMetafieldHeaders(items);

  const headers = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Product Category",
    "Type",
    "Tags",
    "Published",
    "Status",
    "Option1 Name",
    "Option1 Value",
    "Option1 Linked To",
    "Variant SKU",
    "Variant Grams",
    "Variant Inventory Tracker",
    "Variant Inventory Qty",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Price",
    "Variant Compare At Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Image Src",
    "Image Alt Text",
    "Gift Card",
    "SEO Title",
    "SEO Description",
    ...metaHeaders,
  ];

  const rows: unknown[][] = [];

  for (const item of items) {
    const handle = toHandle(pick(item, "handle", "slug", "name", "title"), "product");
    const title = String(pick(item, "title", "name") ?? "");
    const body = String(
      pick(item, "body_html", "description", "content", "body") ?? "",
    );
    // Shopify's product CSV has no category column — Woo categories travel
    // as tags (alongside real tags) so products stay grouped on arrival.
    const tags = toTagList([
      ...asNameList(item.tags),
      ...asNameList(item.categories),
    ]);

    // Woo exposes these flat; MMC products use nested `pricing`/`lazy_stock`.
    const price =
      pick(item, "price", "regular_price") ??
      (item.pricing as any)?.price ??
      "0";
    const compareAt =
      pick(item, "compare_at_price", "sale_price") ??
      (item.pricing as any)?.compareAtPrice ??
      "";
    const stockQty =
      pick(item, "stock_quantity", "qty") ??
      (item.lazy_stock as any)?.quantity ??
      "";
    const manageStock =
      pick(item, "manage_stock") ??
      (item.lazy_stock as any)?.manage ??
      false;

    const published = isPublished(item, "status", "published");
    const metafields = metafieldColumns(item);
    const seo = seoColumns(item);

    const images = collectProductImages(item);

    images.forEach((image, index) => {
      const row: unknown[] = [
        handle,
        // Title/variant fields only on the first row; continuation rows are
        // identified by Shopify via the repeated handle.
        index === 0 ? title : "",
        index === 0 ? body : "",
        index === 0 ? String(pick(item, "vendor", "shop") ?? "") : "",
        index === 0 ? String(pick(item, "product_category", "google_category") ?? "") : "",
        index === 0 ? String(pick(item, "type", "product_type") ?? "") : "",
        index === 0 ? tags : "",
        index === 0 ? (published ? "TRUE" : "FALSE") : "",
        index === 0 ? (published ? "active" : "draft") : "",
        index === 0 ? "Title" : "",
        index === 0 ? "Default Title" : "",
        index === 0 ? "false" : "",
        index === 0 ? String(pick(item, "sku", "invId") ?? "") : "",
        index === 0 ? String(pick(item, "weight_g", "weight") ?? "0") : "",
        index === 0 && manageStock ? "shopify" : "",
        index === 0 && manageStock ? String(stockQty ?? "0") : "",
        index === 0 && manageStock ? "deny" : "",
        index === 0 ? "manual" : "",
        index === 0 ? String(price) : "",
        index === 0 ? String(compareAt) : "",
        index === 0 ? "TRUE" : "",
        index === 0 ? "TRUE" : "",
        image.src,
        image.alt,
        index === 0 ? "FALSE" : "",
      ];

      if (index === 0) {
        const extras = [...seo, ...metafields];
        // Skip seo.* metafields when the SEO columns already carry the same
        // values — duplication in the merchant's store, not information.
        const hasSeoColumns = seo.length > 0;
        for (const { column, value } of extras) {
          if (hasSeoColumns && column.startsWith("Metafield: seo.")) continue;
          const position = headers.indexOf(column);
          if (position >= 0) row[position] = value;
        }
      }

      rows.push(row);
    });
  }

  return toCsv(headers, rows);
}

/**
 * Normalises array-or-scalar tag/category values into a flat list of names,
 * handling Woo `{id,name}` objects, REST `{name}` refs and plain strings.
 */
function asNameList(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((entry) =>
      typeof entry === "object" && entry !== null
        ? String((entry as any).name ?? "")
        : String(entry),
    );
  }
  if (typeof input === "string") {
    return input.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** All images of a product across Woo/MMC/legacy shapes, first one wins. */
function collectProductImages(item: Record<string, unknown>): Array<{
  src: string;
  alt: string;
}> {
  const images: Array<{ src: string; alt: string }> = [];

  const push = (src: unknown, alt: unknown = "") => {
    const url = String(src ?? "").trim();
    if (!url) return;
    images.push({ src: stripImageProxy(url), alt: String(alt ?? "") });
  };

  if (Array.isArray(item.images)) {
    for (const image of item.images) {
      if (typeof image === "string") {
        push(image);
      } else if (image && typeof image === "object") {
        push((image as any).src ?? (image as any).url, (image as any).alt);
      }
    }
  }

  if (images.length === 0) push(item.featured_image, item.featured_image_alt);

  return images;
}
