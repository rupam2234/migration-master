import type { WordPressResource } from "@/lib/sharedResources";
import { blogPostsCsv, categoriesCsv } from "./posts";
import { productsCsv } from "./products";

export { blogPostsCsv, categoriesCsv, productsCsv };
export { metafieldColumns, collectMetafieldHeaders, seoColumns } from "./metafields";
export { csvCell, toCsv, toHandle, toTagList, stripHtml } from "./csv-utils";

/**
 * Resources the WP→Shopify CSV path can transform, by Shopify target:
 * - `products` → Shopify's native product CSV (Admin → Products → Import)
 * - `posts` → blog-post CSV (Matrixify-compatible; no native Shopify importer)
 * - `categories` → collections CSV (Matrixify-compatible)
 */
export const SHOPIFY_CSV_RESOURCES: WordPressResource[] = [
  "products",
  "posts",
  "categories",
];

/**
 * Dispatches a batch of WordPress records to the right Shopify CSV mapper.
 *
 * Per-resource mappers are pure functions so each one can be unit-tested and
 * the export pipeline stays a thin orchestrator.
 */
export function generateShopifyCsv(
  resource: WordPressResource,
  items: any[],
): string {
  switch (resource) {
    case "products":
      return productsCsv(items);
    case "posts":
      return blogPostsCsv(items);
    case "categories":
      return categoriesCsv(items);
    default:
      throw new Error(
        `Shopify CSV export is not supported for resource "${resource}" yet`,
      );
  }
}
