import { Resurces } from "@/app/api/shopify/[resources]/fetch/route";


export interface ShopifyProductImage {
    url: string;
    altText?: string;
}

export interface ShopifyProductVariant {
    id: string;
    title: string;
    sku?: string;
    price: string;
    compareAtPrice?: string | null;
    inventoryQuantity?: number;
    availableForSale?: boolean;
    selectedOptions?: { name: string; value: string }[];
    image?: { url: string; altText?: string } | null;
}

export interface ShopifyProductOption {
    name: string;
    values: string[];
}

export interface ShopifyProduct {
    id: string;
    title: string;
    handle: string;
    description?: string;
    descriptionHtml?: string;
    vendor?: string;
    productType?: string;
    tags?: string[];
    status?: string;
    createdAt: string;
    updatedAt?: string;
    publishedAt?: string;
    totalInventory?: number;
    featuredImage?: ShopifyProductImage;
    images?: ShopifyProductImage[];
    options?: ShopifyProductOption[];
    priceRangeV2?: {
        minVariantPrice: { amount: string; currencyCode: string };
        maxVariantPrice: { amount: string; currencyCode: string };
    };
    variants?: ShopifyProductVariant[];
}

export interface ShopifyImage {
    id: string;
    alt?: string;
    createdAt: string;
    fileStatus: string;
    fileErrors?: { code: string; message: string }[];
    preview?: { image?: { url: string; width: number; height: number } };
    // MediaImage
    mimeType?: string;
    image?: { url: string; width: number; height: number; altText?: string };
    originalSource?: { fileSize?: number };
    // Video
    duration?: number;
    // GenericFile
    url?: string;
    originalFileSize?: number;
}

export interface ShopifyBlog {
    id: string;
    title: string;
    handle: string;
}

export interface ShopifyArticle {
    id: string;
    title: string;
    handle: string;
    body: string;
    author?: { name: string };
    createdAt: string;
    publishedAt?: string;
    blogId?: string;
    blogTitle?: string;
}

export interface ShopifyPage {
    id: string;
    title: string;
    handle: string;
    body: string;
    createdAt: string;
    updatedAt: string;
}

export interface WXRConfig {
    /** Your WordPress site URL, e.g. "https://mysite.com" */
    siteUrl: string;
    /** Author to attribute posts/pages to (default: "admin") */
    defaultAuthor?: string;
    /** WordPress export version (default: "1.2") */
    wxrVersion?: string;
}

/** Escape characters that are unsafe inside XML text nodes */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/** Wrap in CDATA so rich HTML bodies survive the XML round-trip */
function cdata(str: string): string {
    // Escape any ]]> sequences inside the content so CDATA stays valid
    return `<![CDATA[${str.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** Format an ISO date string to RFC-2822 (WordPress pubDate) */
function toRFC2822(iso: string): string {
    return new Date(iso).toUTCString();
}

/** Format an ISO date string to MySQL datetime (WordPress post_date) */
function toMySQLDate(iso: string): string {
    return new Date(iso).toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Derive a numeric post ID from a Shopify GID.
 * e.g. "gid://shopify/Article/123456" → 123456
 * Falls back to a hash of the full GID string for safety.
 *
 * Because this is derived directly from the Shopify GID, IDs stay
 * globally unique across chunked exports with no extra bookkeeping.
 */
function gidToId(gid: string): number {
    const match = gid.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
    // Fallback: simple hash
    return Math.abs(
        gid.split("").reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)
    );
}

/** Derive a filename from a URL */
function urlToFilename(url: string): string {
    try {
        const { pathname } = new URL(url);
        return pathname.split("/").pop() ?? "file";
    } catch {
        return url.split("/").pop() ?? "file";
    }
}

/** Strip extension from filename */
function stripExt(filename: string): string {
    return filename.replace(/\.[^.]+$/, "");
}

function wxrHeader(cfg: WXRConfig, title: string): string {
    const version = cfg.wxrVersion ?? "1.2";
    const pubDate = new Date().toUTCString();
    return `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"
        xmlns:excerpt="http://wordpress.org/export/${version}/excerpt/"
        xmlns:content="http://purl.org/rss/1.0/modules/content/"
        xmlns:wfw="http://wellformedweb.org/CommentAPI/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:wp="http://wordpress.org/export/${version}/">
        <channel>
        <title>${escapeXml(title)}</title>
        <link>${escapeXml(cfg.siteUrl)}</link>
        <description></description>
        <pubDate>${pubDate}</pubDate>
        <language>en-US</language>
        <wp:wxr_version>${version}</wp:wxr_version>
        <wp:base_site_url>${escapeXml(cfg.siteUrl)}</wp:base_site_url>
        <wp:base_blog_url>${escapeXml(cfg.siteUrl)}</wp:base_blog_url>
        `;
}

function wxrFooter(): string {
    return `</channel>\n</rss>`;
}

/**
 * Generates a WXR file containing all Shopify media files as
 * WordPress attachment items. WordPress will download each file
 * from the source URL during import.
 */
export function generateImagesWXR(
    images: ShopifyImage[],
    cfg: WXRConfig
): string {
    const author = cfg.defaultAuthor ?? "admin";
    const items = images
        .map((img) => {
            // Resolve the best URL available across all file types
            const sourceUrl =
                img.image?.url ??
                img.preview?.image?.url ??
                img.url ??
                "";

            if (!sourceUrl) return ""; // Skip files with no resolvable URL

            const postId = gidToId(img.id);
            const filename = urlToFilename(sourceUrl);
            const slug = stripExt(filename);
            const altText = img.alt ?? img.image?.altText ?? "";
            const postDate = toMySQLDate(img.createdAt);
            const pubDate = toRFC2822(img.createdAt);

            return `<item>
                        <title>${escapeXml(filename)}</title>
                        <link>${escapeXml(cfg.siteUrl)}/?attachment_id=${postId}</link>
                        <pubDate>${pubDate}</pubDate>
                        <dc:creator>${cdata(author)}</dc:creator>
                        <content:encoded>${cdata("")}</content:encoded>
                        <excerpt:encoded>${cdata("")}</excerpt:encoded>
                        <wp:post_id>${postId}</wp:post_id>
                        <wp:post_date>${cdata(postDate)}</wp:post_date>
                        <wp:post_date_gmt>${cdata(postDate)}</wp:post_date_gmt>
                        <wp:comment_status>${cdata("closed")}</wp:comment_status>
                        <wp:ping_status>${cdata("closed")}</wp:ping_status>
                        <wp:post_name>${cdata(slug)}</wp:post_name>
                        <wp:status>${cdata("inherit")}</wp:status>
                        <wp:post_type>${cdata("attachment")}</wp:post_type>
                        <wp:post_parent>0</wp:post_parent>
                        <wp:menu_order>0</wp:menu_order>
                        <wp:attachment_url>${cdata(sourceUrl)}</wp:attachment_url>
                        <wp:postmeta>
                        <wp:meta_key>${cdata("_wp_attachment_image_alt")}</wp:meta_key>
                        <wp:meta_value>${cdata(altText)}</wp:meta_value>
                        </wp:postmeta>
                        <wp:postmeta>
                        <wp:meta_key>${cdata("_shopify_gid")}</wp:meta_key>
                        <wp:meta_value>${cdata(img.id)}</wp:meta_value>
                        </wp:postmeta>
                    </item>`;
        })
        .filter(Boolean)
        .join("\n");

    return wxrHeader(cfg, "Shopify Media Export") + items + "\n" + wxrFooter();
}

/**
 * Generates a WXR file containing all Shopify blogs as
 * WordPress categories. Import this BEFORE articles so the
 * categories exist for posts to reference.
 *
 * @param startTermId - first wp:term_id to assign (default 1).
 *   Pass an offset when generating multiple chunked blog files so
 *   term IDs stay unique across files.
 */
export function generateBlogsWXR(
    blogs: ShopifyBlog[],
    cfg: WXRConfig,
    startTermId: number = 1
): string {
    let termIdCounter = startTermId;

    const categoryBlocks = blogs
        .map((blog) => {
            const termId = termIdCounter++;
            return `  <wp:category>
    <wp:term_id>${termId}</wp:term_id>
    <wp:category_nicename>${cdata(blog.handle)}</wp:category_nicename>
    <wp:category_parent></wp:category_parent>
    <wp:cat_name>${cdata(blog.title)}</wp:cat_name>
  </wp:category>`;
        })
        .join("\n");

    return wxrHeader(cfg, "Shopify Blogs Export") + categoryBlocks + "\n" + wxrFooter();
}

/**
 * Generates a WXR file containing all Shopify articles as
 * WordPress posts, linked to their parent blog by category slug.
 *
 * Import AFTER blogs so categories already exist in WordPress.
 *
 * Note: image URLs inside post bodies still point to Shopify CDN.
 * After importing, run a Search & Replace (WP-CLI or Better Search
 * Replace plugin) to swap Shopify CDN URLs for WordPress media URLs.
 */
export function generateArticlesWXR(
    articles: ShopifyArticle[],
    cfg: WXRConfig
): string {
    const author = cfg.defaultAuthor ?? "admin";

    // Build a map of blogId → handle so we can look up the category slug.
    // The handle is embedded in the GID: gid://shopify/Blog/123 doesn't
    // carry the handle, so we derive the slug from the title instead as
    // a safe fallback (matches what generateBlogsWXR produces).
    function titleToSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    const items = articles
        .map((article) => {
            const postId = gidToId(article.id);
            const publishDate = article.publishedAt ?? article.createdAt;
            const postDate = toMySQLDate(publishDate);
            const pubDate = toRFC2822(publishDate);
            const categorySlug = article.blogTitle
                ? titleToSlug(article.blogTitle)
                : "";
            const categoryName = article.blogTitle ?? "";
            const authorName = article.author?.name ?? author;

            const categoryTag =
                categorySlug
                    ? `    <category domain="category" nicename="${escapeXml(categorySlug)}">${cdata(categoryName)}</category>`
                    : "";

            return `  <item>
    <title>${escapeXml(article.title)}</title>
    <link>${escapeXml(cfg.siteUrl)}/${escapeXml(article.handle)}/</link>
    <pubDate>${pubDate}</pubDate>
    <dc:creator>${cdata(authorName)}</dc:creator>
    <content:encoded>${cdata(article.body ?? "")}</content:encoded>
    <excerpt:encoded>${cdata("")}</excerpt:encoded>
${categoryTag}
    <wp:post_id>${postId}</wp:post_id>
    <wp:post_date>${cdata(postDate)}</wp:post_date>
    <wp:post_date_gmt>${cdata(postDate)}</wp:post_date_gmt>
    <wp:comment_status>${cdata("closed")}</wp:comment_status>
    <wp:ping_status>${cdata("closed")}</wp:ping_status>
    <wp:post_name>${cdata(article.handle)}</wp:post_name>
    <wp:status>${cdata("publish")}</wp:status>
    <wp:post_type>${cdata("post")}</wp:post_type>
    <wp:post_parent>0</wp:post_parent>
    <wp:menu_order>0</wp:menu_order>
    <wp:is_sticky>0</wp:is_sticky>
    <wp:postmeta>
      <wp:meta_key>${cdata("_shopify_gid")}</wp:meta_key>
      <wp:meta_value>${cdata(article.id)}</wp:meta_value>
    </wp:postmeta>
  </item>`;
        })
        .join("\n");

    return wxrHeader(cfg, "Shopify Articles Export") + items + "\n" + wxrFooter();
}

/**
 * Generates a WXR file containing all Shopify pages as
 * WordPress pages. Same image URL caveat applies as for articles.
 */
export function generatePagesWXR(
    pages: ShopifyPage[],
    cfg: WXRConfig
): string {
    const author = cfg.defaultAuthor ?? "admin";

    const items = pages
        .map((page) => {
            const postId = gidToId(page.id);
            const postDate = toMySQLDate(page.createdAt);
            const pubDate = toRFC2822(page.createdAt);

            return `  <item>
    <title>${escapeXml(page.title)}</title>
    <link>${escapeXml(cfg.siteUrl)}/${escapeXml(page.handle)}/</link>
    <pubDate>${pubDate}</pubDate>
    <dc:creator>${cdata(author)}</dc:creator>
    <content:encoded>${cdata(page.body ?? "")}</content:encoded>
    <excerpt:encoded>${cdata("")}</excerpt:encoded>
    <wp:post_id>${postId}</wp:post_id>
    <wp:post_date>${cdata(postDate)}</wp:post_date>
    <wp:post_date_gmt>${cdata(postDate)}</wp:post_date_gmt>
    <wp:comment_status>${cdata("closed")}</wp:comment_status>
    <wp:ping_status>${cdata("closed")}</wp:ping_status>
    <wp:post_name>${cdata(page.handle)}</wp:post_name>
    <wp:status>${cdata("publish")}</wp:status>
    <wp:post_type>${cdata("page")}</wp:post_type>
    <wp:post_parent>0</wp:post_parent>
    <wp:menu_order>0</wp:menu_order>
    <wp:is_sticky>0</wp:is_sticky>
    <wp:postmeta>
      <wp:meta_key>${cdata("_shopify_gid")}</wp:meta_key>
      <wp:meta_value>${cdata(page.id)}</wp:meta_value>
    </wp:postmeta>
  </item>`;
        })
        .join("\n");

    return wxrHeader(cfg, "Shopify Pages Export") + items + "\n" + wxrFooter();
}

/**
 * Deterministic pseudo-ID for URLs that have no Shopify GID of their
 * own (e.g. product images). Offset so collisions with real Shopify
 * numeric IDs (13+ digits) are extremely unlikely, but this is a
 * best-effort hash, not a guarantee — if you hit a collision across
 * a very large catalog, salt the input string per-product.
 */
function pseudoIdFromString(str: string): number {
    const hash = Math.abs(
        str.split("").reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)
    );
    return 900_000_000_000 + hash;
}

function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * Minimal PHP serialize() for the plain shapes WooCommerce needs
 * (_product_attributes is stored as a serialized PHP array in
 * postmeta — WordPress's importer does NOT accept JSON here).
 * Supports: string, number, and plain objects/arrays of those.
 */
function phpSerialize(value: unknown): string {
    if (typeof value === "string") {
        return `s:${Buffer.byteLength(value, "utf8")}:"${value}";`;
    }
    if (typeof value === "number") {
        return Number.isInteger(value) ? `i:${value};` : `d:${value};`;
    }
    if (typeof value === "boolean") {
        return `b:${value ? 1 : 0};`;
    }
    if (Array.isArray(value)) {
        const body = value
            .map((v, i) => phpSerialize(i) + phpSerialize(v))
            .join("");
        return `a:${value.length}:{${body}}`;
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);
        const body = entries
            .map(([k, v]) => phpSerialize(k) + phpSerialize(v))
            .join("");
        return `a:${entries.length}:{${body}}`;
    }
    return `N;`; // null / undefined
}

/**
 * Single entry point — pass the resource name and its data array,
 * get back a WXR XML string ready to save as a .xml file and feed
 * to WordPress Tools → Import → WordPress.
 *
 * @example
 * const xml = generateWXR("images", shopifyImages, { siteUrl: "https://mysite.com" });
 * fs.writeFileSync("images.xml", xml);
 */
export function generateWXR(
    resource: Resurces,
    data: any[],
    cfg: WXRConfig
): string {
    switch (resource) {
        case "images":
            return generateImagesWXR(data as ShopifyImage[], cfg);
        case "blogs":
            return generateBlogsWXR(data as ShopifyBlog[], cfg);
        case "articles":
            return generateArticlesWXR(data as ShopifyArticle[], cfg);
        case "pages":
            return generatePagesWXR(data as ShopifyPage[], cfg);
        case "products":
            return generateProductsWXR(data as ShopifyProduct[], cfg);
        default:
            throw new Error(`Unknown WXR resource: ${resource}`);
    }
}

function chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0) return [items];
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export interface WXRChunk {
    /** Suggested filename, e.g. "shopify-images-part1.xml" */
    filename: string;
    xml: string;
    itemCount: number;
}

/**
 * Default batch sizes per resource type, tuned for typical shared
 * hosting PHP limits (max_execution_time / memory_limit):
 *
 *  - images: kept small because WordPress downloads each remote
 *    media URL synchronously during import — this is the slowest
 *    step per item and the most likely to trigger a timeout.
 *  - blogs: categories are usually few, chunking is rarely needed.
 *  - articles/pages: cheap DB inserts with no external fetch, so
 *    larger batches are safe.
 *
 * Override per-call with the chunkSize argument if your host allows
 * more (or needs less).
 */
const DEFAULT_CHUNK_SIZE: Record<Resurces, number> = {
    images: 75,
    blogs: 500,
    articles: 250,
    pages: 250,
    orders: 200,
    single_article: 1,
    products: 50,
};

/**
 * Same as generateWXR, but splits the data into multiple WXR files
 * so each individual WordPress import stays fast and safely within
 * execution-time / memory limits. Import the resulting files in
 * order (part1, part2, ...) via Tools → Import → WordPress.
 *
 * @example
 * const chunks = generateWXRChunks("images", shopifyImages, cfg);
 * for (const { filename, xml } of chunks) {
 *   fs.writeFileSync(filename, xml);
 * }
 */
export function generateWXRChunks(
    resource: Resurces,
    data: any[],
    cfg: WXRConfig,
    chunkSize?: number
): WXRChunk[] {
    const size = chunkSize ?? DEFAULT_CHUNK_SIZE[resource] ?? 100;
    const batches = chunkArray(data, size);
    const multiPart = batches.length > 1;

    let termIdOffset = 0; // only used for blogs, to keep term_id unique

    return batches.map((batch, i) => {
        const partLabel = multiPart ? `-part${i + 1}` : "";
        let xml: string;

        if (resource === "blogs") {
            xml = generateBlogsWXR(batch as ShopifyBlog[], cfg, termIdOffset + 1);
            termIdOffset += batch.length;
        } else {
            xml = generateWXR(resource, batch, cfg);
        }

        return {
            filename: `shopify-${resource}${partLabel}.xml`,
            xml,
            itemCount: batch.length,
        };
    });
}

export function generateProductsWXR(
    products: ShopifyProduct[],
    cfg: WXRConfig
): string {
    const author = cfg.defaultAuthor ?? "admin";
    const blocks: string[] = [];

    for (const product of products) {
        const postId = gidToId(product.id);
        const postDate = toMySQLDate(product.createdAt);
        const pubDate = toRFC2822(product.publishedAt ?? product.createdAt);
        const variants = product.variants ?? [];
        const isVariable =
            variants.length > 1 ||
            (variants.length === 1 && variants[0].title !== "Default Title");

        // ---- Images: emit as attachment items parented to this product ----
        const allImages = [
            ...(product.featuredImage ? [product.featuredImage] : []),
            ...(product.images ?? []).filter(
                (img) => img.url !== product.featuredImage?.url
            ),
        ];

        const attachmentIds: number[] = [];
        const attachmentItems = allImages.map((img) => {
            const attId = pseudoIdFromString(img.url);
            attachmentIds.push(attId);
            const filename = urlToFilename(img.url);

            return `  <item>
                <title>${escapeXml(filename)}</title>
                <link>${escapeXml(cfg.siteUrl)}/?attachment_id=${attId}</link>
                <pubDate>${pubDate}</pubDate>
                <dc:creator>${cdata(author)}</dc:creator>
                <content:encoded>${cdata("")}</content:encoded>
                <excerpt:encoded>${cdata("")}</excerpt:encoded>
                <wp:post_id>${attId}</wp:post_id>
                <wp:post_date>${cdata(postDate)}</wp:post_date>
                <wp:post_date_gmt>${cdata(postDate)}</wp:post_date_gmt>
                <wp:comment_status>${cdata("closed")}</wp:comment_status>
                <wp:ping_status>${cdata("closed")}</wp:ping_status>
                <wp:post_name>${cdata(stripExt(filename))}</wp:post_name>
                <wp:status>${cdata("inherit")}</wp:status>
                <wp:post_type>${cdata("attachment")}</wp:post_type>
                <wp:post_parent>${postId}</wp:post_parent>
                <wp:menu_order>0</wp:menu_order>
                <wp:attachment_url>${cdata(img.url)}</wp:attachment_url>
                <wp:postmeta>
                <wp:meta_key>${cdata("_wp_attachment_image_alt")}</wp:meta_key>
                <wp:meta_value>${cdata(img.altText ?? "")}</wp:meta_value>
                </wp:postmeta>
            </item>`;
        });

        // ---- Price / stock ----
        const minPrice = product.priceRangeV2?.minVariantPrice.amount;
        const simplePrice = variants[0]?.price ?? minPrice ?? "0.00";
        const simpleCompareAt = variants[0]?.compareAtPrice ?? null;
        const onSale =
            simpleCompareAt && parseFloat(simpleCompareAt) > parseFloat(simplePrice);

        const totalStock =
            product.totalInventory ??
            variants.reduce((sum, v) => sum + (v.inventoryQuantity ?? 0), 0);
        const inStock =
            variants.some((v) => v.availableForSale) || totalStock > 0;

        // ---- Attributes (needed even for simple products with 1 option) ----
        const attributesArray: Record<string, unknown> = {};
        (product.options ?? []).forEach((opt, i) => {
            attributesArray[slugify(opt.name)] = {
                name: opt.name,
                value: opt.values.join(" | "),
                position: i,
                is_visible: 1,
                is_variation: isVariable ? 1 : 0,
                is_taxonomy: 0,
            };
        });

        // ---- Category / tag tags ----
        const categoryTag = product.productType
            ? `    <category domain="product_cat" nicename="${escapeXml(
                slugify(product.productType)
            )}">${cdata(product.productType)}</category>\n`
            : "";
        const tagTags = (product.tags ?? [])
            .map(
                (tag) =>
                    `    <category domain="product_tag" nicename="${escapeXml(
                        slugify(tag)
                    )}">${cdata(tag)}</category>`
            )
            .join("\n");

        const productMeta: [string, string][] = [
            ["_sku", variants[0]?.sku ?? ""],
            ["_regular_price", onSale ? String(simpleCompareAt) : String(simplePrice)],
            ["_price", String(simplePrice)],
            ["_manage_stock", "yes"],
            ["_stock", String(totalStock)],
            ["_stock_status", inStock ? "instock" : "outofstock"],
            ["_visibility", "visible"],
            ["_product_attributes", phpSerialize(attributesArray)],
            ["_shopify_gid", product.id],
        ];
        if (onSale) productMeta.push(["_sale_price", String(simplePrice)]);
        if (attachmentIds.length > 0) {
            productMeta.push(["_thumbnail_id", String(attachmentIds[0])]);
        }
        if (attachmentIds.length > 1) {
            productMeta.push(["_product_image_gallery", attachmentIds.slice(1).join(",")]);
        }

        const productMetaXml = productMeta
            .map(
                ([key, value]) => `    <wp:postmeta>
                <wp:meta_key>${cdata(key)}</wp:meta_key>
                <wp:meta_value>${cdata(value)}</wp:meta_value>
                </wp:postmeta>`
            )
            .join("\n");

        const productItem = `  <item>
                <title>${escapeXml(product.title)}</title>
                <link>${escapeXml(cfg.siteUrl)}/product/${escapeXml(product.handle)}/</link>
                <pubDate>${pubDate}</pubDate>
                <dc:creator>${cdata(author)}</dc:creator>
                <content:encoded>${cdata(product.descriptionHtml ?? product.description ?? "")}</content:encoded>
                <excerpt:encoded>${cdata("")}</excerpt:encoded>
            ${categoryTag}${tagTags ? tagTags + "\n" : ""}    <category domain="product_type" nicename="${isVariable ? "variable" : "simple"
            }">${cdata(isVariable ? "variable" : "simple")}</category>
                <wp:post_id>${postId}</wp:post_id>
                <wp:post_date>${cdata(postDate)}</wp:post_date>
                <wp:post_date_gmt>${cdata(postDate)}</wp:post_date_gmt>
                <wp:comment_status>${cdata("closed")}</wp:comment_status>
                <wp:ping_status>${cdata("closed")}</wp:ping_status>
                <wp:post_name>${cdata(product.handle)}</wp:post_name>
                <wp:status>${cdata(product.status === "ACTIVE" ? "publish" : "draft")}</wp:status>
                <wp:post_type>${cdata("product")}</wp:post_type>
                <wp:post_parent>0</wp:post_parent>
                <wp:menu_order>0</wp:menu_order>
                <wp:is_sticky>0</wp:is_sticky>
            ${productMetaXml}
            </item>`;

        blocks.push(productItem, ...attachmentItems);

        // ---- Variations (only for variable products) ----
        if (isVariable) {
            for (const variant of variants) {
                const variationId = gidToId(variant.id);
                const varMeta: [string, string][] = [
                    ["_sku", variant.sku ?? ""],
                    ["_regular_price", String(variant.compareAtPrice ?? variant.price)],
                    ["_price", String(variant.price)],
                    ["_stock", String(variant.inventoryQuantity ?? 0)],
                    [
                        "_stock_status",
                        variant.availableForSale ? "instock" : "outofstock",
                    ],
                    ["_shopify_gid", variant.id],
                ];
                if (
                    variant.compareAtPrice &&
                    parseFloat(variant.compareAtPrice) > parseFloat(variant.price)
                ) {
                    varMeta.push(["_sale_price", String(variant.price)]);
                }
                (variant.selectedOptions ?? []).forEach((opt) => {
                    varMeta.push([`attribute_${slugify(opt.name)}`, opt.value]);
                });

                const varMetaXml = varMeta
                    .map(
                        ([key, value]) => `    <wp:postmeta>
                    <wp:meta_key>${cdata(key)}</wp:meta_key>
                    <wp:meta_value>${cdata(value)}</wp:meta_value>
                    </wp:postmeta>`
                    )
                    .join("\n");

                blocks.push(`  <item>
                    <title>${escapeXml(`${product.title} - ${variant.title}`)}</title>
                    <link>${escapeXml(cfg.siteUrl)}/?post_type=product_variation&p=${variationId}</link>
                    <pubDate>${pubDate}</pubDate>
                    <dc:creator>${cdata(author)}</dc:creator>
                    <content:encoded>${cdata("")}</content:encoded>
                    <excerpt:encoded>${cdata("")}</excerpt:encoded>
                    <wp:post_id>${variationId}</wp:post_id>
                    <wp:post_date>${cdata(postDate)}</wp:post_date>
                    <wp:post_date_gmt>${cdata(postDate)}</wp:post_date_gmt>
                    <wp:comment_status>${cdata("closed")}</wp:comment_status>
                    <wp:ping_status>${cdata("closed")}</wp:ping_status>
                    <wp:post_name>${cdata(`${product.handle}-${slugify(variant.title)}`)}</wp:post_name>
                    <wp:status>${cdata("publish")}</wp:status>
                    <wp:post_type>${cdata("product_variation")}</wp:post_type>
                    <wp:post_parent>${postId}</wp:post_parent>
                    <wp:menu_order>0</wp:menu_order>
                ${varMetaXml}
                </item>`);
            }
        }
    }

    return (
        wxrHeader(cfg, "Shopify Products Export") +
        blocks.join("\n") +
        "\n" +
        wxrFooter()
    );
}