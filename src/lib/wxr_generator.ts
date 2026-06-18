/**
 * wxr-generator.ts
 *
 * Converts Shopify resource payloads (from fetchAllResources) into
 * WordPress eXtended RSS (WXR 1.2) XML strings, one resource type
 * at a time so each can be imported individually in the correct order:
 *
 *   1. images   → Media Library attachments
 *   2. blogs    → Categories
 *   3. articles → Posts  (linked to categories by slug)
 *   4. pages    → Pages
 *
 * Large catalogs can be split into chunked WXR files via
 * generateWXRChunks() so each individual import stays well within
 * typical PHP max_execution_time / memory_limit constraints.
 */

import { Resurces } from "@/app/api/shopify/[resources]/fetch/route";


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

            return `  <item>
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
        default:
            throw new Error(`Unknown WXR resource: ${resource}`);
    }
}

/** Split an array into fixed-size batches, preserving order. */
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
    single_article: 1
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