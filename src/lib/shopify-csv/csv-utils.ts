/**
 * Low-level CSV helpers shared by every Shopify CSV mapper.
 *
 * Kept dependency-free and pure so mappers stay trivially testable and the
 * export pipeline can call them server-side without pulling React into scope.
 */

/**
 * Escapes a single CSV cell. Values containing commas, quotes or newlines are
 * double-quoted with embedded quotes doubled (RFC 4180).
 */
export function csvCell(value: unknown): string {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** Builds a CSV document from a header row and data rows. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }

  return lines.join("\n");
}

/** Shopify handles: lowercase, hyphen-separated, ASCII-safe. */
export function toHandle(input: unknown, fallback = "item"): string {
  const raw = String(input ?? "").toLowerCase();
  const slug = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

/** Flattens array-or-scalar tag lists into Shopify's comma-separated form. */
export function toTagList(input: unknown): string {
  if (Array.isArray(input)) {
    return input
      .map((tag) => (typeof tag === "object" && tag !== null ? (tag as any).name : tag))
      .filter((tag) => tag !== null && tag !== undefined && tag !== "")
      .map(String)
      .join(", ");
  }

  if (typeof input === "string") return input;

  return "";
}

/** First defined candidate — keeps mappers tolerant to Woo vs REST shapes. */
export function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

/** Normalises the many WP/HTML status spellings into TRUE/FALSE for Shopify. */
export function isPublished(record: Record<string, unknown>, ...statusKeys: string[]): boolean {
  const status = String(pick(record, ...statusKeys) ?? "publish").toLowerCase();

  return ["publish", "published", "active", "true", "1", "open"].includes(status);
}

/** Strips HTML tags so excerpt/description text is safe in CSV cells. */
export function stripHtml(input: unknown): string {
  return decodeEntities(
    String(input ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/**
 * Decodes the handful of HTML entities WordPress serialises into REST
 * payloads (`&#038;`, `&#8217;`, …) so titles don't ship with raw codes.
 */
export function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  return input
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (m) => named[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

/**
 * Strips both legacy image-proxy forms the app has produced over time:
 * path suffix (`…jpg/adapt/800x800`) and query param (`…jpg?adapt=800`).
 */
export function stripImageProxy(url: string): string {
  return url.split("/adapt/")[0].split("?adapt=")[0];
}
