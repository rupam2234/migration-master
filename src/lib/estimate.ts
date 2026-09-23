import pool from "./db";
import { envInt } from "./env";
import {
  isBulkImageResource,
  type ResourceEstimate,
  type ResourceEstimateState,
} from "./estimate-utils";
import { refreshShopifyAccessToken } from "./shopify-refresh";
import { createRequestGate, pacedFetch, type RequestGate } from "./throttle";

/**
 * Free migration-estimation layer (server side).
 *
 * Answers "how many items would this store migrate, and roughly what would it
 * cost in credits?" without fetching a single item body: counts come from
 * Shopify's GraphQL count fields and the WordPress connector / WooCommerce
 * `X-WP-Total` headers.
 *
 * The estimate is one transaction end to end:
 *
 *   1. CLAIM  — `estimate_runs` gets a RUNNING row. Concurrent dashboard loads
 *               reuse that run instead of re-hitting the source APIs.
 *   2. COUNT  — every canonical resource for the direction is counted through a
 *               paced request gate: one request at a time, minimum gap between
 *               them, bounded retries that honour `Retry-After`. Shopify needs
 *               a single GraphQL request for the whole store.
 *   3. COMMIT — counts, terminal states and the run completion are written in a
 *               single atomic statement, so a reader can never observe (or
 *               cache) a half-written snapshot.
 *
 * Every resource always lands in a terminal state — `OK`, `UNAVAILABLE` (with a
 * reason) or `DEFERRED` — which is what lets the dashboard settle instead of
 * rendering "estimating…" forever for a resource that will never resolve.
 *
 * Pricing rules mirror the payment routes exactly (a single place would be
 * better long-term; until then both sides must stay in sync):
 * - Bulk images (MEDIA_LIBRARY): first FREE_IMAGE_LIMIT free, excess tiered.
 * - Everything else: every item is chargeable.
 * Credits are denominated 1 credit = 1 chargeable item.
 */

/** Cache TTL for a committed snapshot. */
const COUNT_TTL_MS = envInt("ESTIMATE_TTL_MS", 24 * 60 * 60 * 1000);

/** A forced refresh inside this window would just re-hit the source APIs. */
const MIN_FORCE_INTERVAL_MS = envInt("ESTIMATE_MIN_REFRESH_MS", 60 * 1000);

/** A RUNNING claim older than this is treated as abandoned (crashed worker). */
const RUN_STALE_SECONDS = Math.round(
  envInt("ESTIMATE_RUN_STALE_MS", 120 * 1000) / 1000,
);

/** Minimum gap between two Shopify requests from this instance. */
const SHOPIFY_REQUEST_GAP_MS = envInt("ESTIMATE_SHOPIFY_GAP_MS", 600);

/** Minimum gap between two WordPress requests from this instance. */
const WORDPRESS_REQUEST_GAP_MS = envInt("ESTIMATE_WORDPRESS_GAP_MS", 250);

/** Bulk-image free allowance — matches check-export/create-order routes. */
const FREE_IMAGE_LIMIT = envInt("FREE_IMAGE_LIMIT", 3000);

const SHOPIFY_API_VERSION = "2026-01";

/** Blogs whose article counts are summed inside the single count query. */
const MAX_BLOGS = 250;

export type EstimateDirection = "shopify_to_wp" | "wp_to_shopify";

/**
 * Every resource the dashboard can render, per direction, in display order.
 * A snapshot always contains all of them — that is the "full update" the
 * dashboard relies on.
 */
const RESOURCES_BY_DIRECTION: Record<EstimateDirection, string[]> = {
  shopify_to_wp: [
    "PRODUCTS",
    "ORDERS",
    "CUSTOMERS",
    "COUPONS",
    "PAGES",
    "BLOGS",
    "ARTICLES",
    "IMAGES",
  ],
  wp_to_shopify: [
    "POSTS",
    "PAGES",
    "MEDIA",
    "CATEGORIES",
    "PRODUCTS",
    "ORDERS",
    "CUSTOMERS",
    "COUPONS",
  ],
};

export interface EstimateSnapshot {
  direction: EstimateDirection;
  resources: Record<string, ResourceEstimate>;
  /** Sum of every countable resource; null when nothing was countable. */
  totalCredits: number | null;
  /** True when at least one resource is not `OK`, so the total is a floor. */
  partial: boolean;
  /** ISO timestamp of the commit that produced this snapshot. */
  updatedAt: string | null;
}

export interface EstimateResult {
  snapshot: EstimateSnapshot | null;
  cached: boolean;
  /** A run is in flight right now — this response may be a previous snapshot. */
  running: boolean;
}

/** 1 credit = 1 chargeable item, with the bulk-image free tier applied. */
export function estimateCredits(
  resource: string,
  count: number | null,
): number | null {
  if (count === null || count === undefined) return null;

  const chargeable = isBulkImageResource(resource)
    ? Math.max(0, count - FREE_IMAGE_LIMIT)
    : count;

  return chargeable;
}

/** True when this resource/count lands entirely inside the free tier. */
export function isFreeEstimate(resource: string, count: number | null): boolean {
  return estimateCredits(resource, count) === 0;
}

/* ------------------------------------------------------------------ */
/* Pacing                                                             */
/* ------------------------------------------------------------------ */

/**
 * One gate per upstream host, so a WordPress site is never asked for two
 * counts at once while a Shopify store is being counted, and the pacing
 * survives across requests inside the same server instance.
 */
const gates = new Map<string, RequestGate>();

function gateFor(key: string, minIntervalMs: number): RequestGate {
  const existing = gates.get(key);
  if (existing) return existing;

  const gate = createRequestGate(minIntervalMs);
  gates.set(key, gate);
  return gate;
}

/* ------------------------------------------------------------------ */
/* Count bookkeeping                                                   */
/* ------------------------------------------------------------------ */

interface RawCount {
  count: number | null;
  state: ResourceEstimateState;
  reason: string | null;
  exact?: boolean;
}

/** A resource we could not count, with the reason the UI will show. */
function unavailable(reason: string): RawCount {
  return { count: null, state: "UNAVAILABLE", reason };
}

/** A resource that has no cheap store-wide count (bulk media). */
function deferred(reason: string): RawCount {
  return { count: null, state: "DEFERRED", reason };
}

/** A counted resource. `exact: false` marks an approximate source count. */
function counted(count: number, exact = true, note: string | null = null): RawCount {
  return { count, state: "OK", reason: note, exact };
}

/** Marks every resource of a direction unavailable with the same reason. */
function allUnavailable(
  direction: EstimateDirection,
  reason: string,
): Record<string, RawCount> {
  const counts: Record<string, RawCount> = {};
  for (const resource of RESOURCES_BY_DIRECTION[direction]) {
    counts[resource] = unavailable(reason);
  }
  return counts;
}

/** Builds the display/credit view of a stored count map. */
function toSnapshot(
  direction: EstimateDirection,
  raw: Record<string, RawCount>,
  updatedAt: string | null,
): EstimateSnapshot {
  const resources: Record<string, ResourceEstimate> = {};
  let totalCredits: number | null = null;
  let partial = false;

  for (const resource of RESOURCES_BY_DIRECTION[direction]) {
    const entry = raw[resource] ?? unavailable("Not counted yet");
    const credits =
      entry.state === "OK" ? estimateCredits(resource, entry.count) : null;

    resources[resource] = {
      count: entry.count,
      credits,
      state: entry.state,
      reason: entry.reason,
      exact: entry.state === "OK" ? entry.exact !== false : false,
    };

    if (entry.state !== "OK") partial = true;
    if (credits !== null) totalCredits = (totalCredits ?? 0) + credits;
  }

  return { direction, resources, totalCredits, partial, updatedAt };
}

/** Serial date/timestamp values the Neon driver may hand back in either shape. */
function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* ------------------------------------------------------------------ */
/* Snapshot read                                                       */
/* ------------------------------------------------------------------ */

/**
 * Last committed snapshot for a project, read in a single statement so the
 * counts and the completion stamp always agree with each other.
 */
export async function readSnapshot(
  project: string,
  direction: EstimateDirection,
): Promise<EstimateSnapshot | null> {
  const rows = (await pool.query(
    `SELECT
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'resource', resource, 'count', count, 'status', status, 'reason', reason
         )), '[]'::jsonb)
           FROM resource_counts WHERE project = $1) AS resources,
        (SELECT jsonb_build_object(
           'direction', direction, 'status', status, 'completed_at', completed_at
         )
           FROM estimate_runs WHERE project = $1) AS run`,
    [project],
  )) as Array<{
    resources: Array<{
      resource: string;
      count: number | null;
      status: string;
      reason: string | null;
    }> | null;
    run: {
      direction: string;
      status: string;
      completed_at: string | Date | null;
    } | null;
  }>;

  const row = rows[0];
  if (!row?.run || !row.resources?.length) return null;

  // A project that switched migration direction must be re-counted from the
  // new source rather than served the other side's resources.
  if (row.run.direction !== direction) return null;

  const raw: Record<string, RawCount> = {};
  for (const stored of row.resources) {
    raw[stored.resource] = {
      count: stored.count,
      state: (stored.status as ResourceEstimateState) ?? "OK",
      reason: stored.reason,
      exact: stored.status === "OK",
    };
  }

  return toSnapshot(direction, raw, toIso(row.run.completed_at));
}

/* ------------------------------------------------------------------ */
/* The estimate transaction                                            */
/* ------------------------------------------------------------------ */

/**
 * Claims the project's run slot. Returns false when a run is already in flight
 * (another dashboard load is counting the same store), which is how we avoid
 * hammering a source when several tabs open at once. A RUNNING claim older than
 * RUN_STALE_SECONDS is reclaimed, so a crashed worker cannot wedge a project.
 */
async function claimRun(
  project: string,
  direction: EstimateDirection,
): Promise<boolean> {
  const rows = (await pool.query(
    `INSERT INTO estimate_runs (project, direction, status, started_at, completed_at, total_credits, error)
     VALUES ($1, $2, 'RUNNING', NOW(), NULL, NULL, NULL)
     ON CONFLICT (project) DO UPDATE
       SET direction = EXCLUDED.direction,
           status = 'RUNNING',
           started_at = NOW(),
           completed_at = NULL,
           total_credits = NULL,
           error = NULL
     WHERE estimate_runs.status <> 'RUNNING'
        OR estimate_runs.started_at < NOW() - ($3 * interval '1 second')
     RETURNING project`,
    [project, direction, RUN_STALE_SECONDS],
  )) as Array<{ project: string }>;

  return rows.length > 0;
}

/** Records a failed run so the UI can stop waiting and offer a retry. */
async function failRun(project: string, message: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE estimate_runs
          SET status = 'FAILED', completed_at = NOW(), error = $2
        WHERE project = $1`,
      [project, message.slice(0, 500)],
    );
  } catch (error) {
    console.error("[estimate] could not record failed run:", error);
  }
}

/**
 * Single atomic commit: the resource counts and the run completion land in one
 * statement, so a snapshot is either fully visible or not visible at all. The
 * jsonb recordset keeps it to one round trip (the Neon HTTP driver executes the
 * whole statement inside one Postgres transaction).
 */
async function commitSnapshot(
  project: string,
  direction: EstimateDirection,
  raw: Record<string, RawCount>,
): Promise<EstimateSnapshot> {
  const rows = RESOURCES_BY_DIRECTION[direction].map((resource) => {
    const entry = raw[resource] ?? unavailable("Not counted yet");
    return {
      resource,
      count: entry.count,
      status: entry.state,
      reason: entry.reason,
    };
  });

  const { totalCredits } = toSnapshot(direction, raw, null);

  await pool.query(
    `WITH incoming AS (
       SELECT * FROM jsonb_to_recordset($3::jsonb)
         AS t(resource TEXT, count INTEGER, status TEXT, reason TEXT)
     ), upserted AS (
       INSERT INTO resource_counts (project, resource, count, direction, status, reason, fetched_at)
       SELECT $1, incoming.resource, incoming.count, $2, incoming.status, incoming.reason, NOW()
       FROM incoming
       ON CONFLICT (project, resource) DO UPDATE
         SET count = EXCLUDED.count,
             direction = EXCLUDED.direction,
             status = EXCLUDED.status,
             reason = EXCLUDED.reason,
             fetched_at = NOW()
       RETURNING resource
     )
     UPDATE estimate_runs
        SET status = 'READY',
            completed_at = NOW(),
            total_credits = $4,
            error = NULL
      WHERE project = $1`,
    [project, direction, JSON.stringify(rows), totalCredits],
  );

  const committedAt = new Date().toISOString();
  return toSnapshot(direction, raw, committedAt);
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

function countResources(
  project: string,
  direction: EstimateDirection,
): Promise<Record<string, RawCount>> {
  return direction === "shopify_to_wp"
    ? fetchShopifyCounts(project)
    : fetchWordPressCounts(project);
}

/**
 * Snapshot for a project, cached-first.
 *
 * - fresh commit, no `force`  → serve it, zero source calls;
 * - `force` too soon          → serve the cache (a double click must never
 *                               re-count the source);
 * - otherwise                 → claim the run, count, commit. When a run is
 *                               already in flight we hand back the previous
 *                               snapshot with `running: true` so the client can
 *                               poll instead of counting the store twice.
 */
export async function getEstimate(
  project: string,
  direction: EstimateDirection,
  force = false,
): Promise<EstimateResult> {
  const cached = await readSnapshot(project, direction);
  const age = cached?.updatedAt
    ? Date.now() - Date.parse(cached.updatedAt)
    : Number.POSITIVE_INFINITY;

  if (cached && !force && age < COUNT_TTL_MS) {
    return { snapshot: cached, cached: true, running: false };
  }

  if (cached && force && age < MIN_FORCE_INTERVAL_MS) {
    return { snapshot: cached, cached: true, running: false };
  }

  const claimed = await claimRun(project, direction);

  if (!claimed) {
    return { snapshot: cached, cached: cached !== null, running: true };
  }

  try {
    const raw = await countResources(project, direction);
    const snapshot = await commitSnapshot(project, direction, raw);
    return { snapshot, cached: false, running: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown estimate failure";

    await failRun(project, message);

    // A failed recount must not blank a dashboard that already had numbers.
    if (cached) return { snapshot: cached, cached: true, running: false };
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Shopify counters (one GraphQL request for the whole store)          */
/* ------------------------------------------------------------------ */

/**
 * Count fields available on QueryRoot, keyed by our resource name.
 * One request answers all of them — the old implementation fanned out to six
 * REST `count.json` endpoints in parallel, which is what pushed standard stores
 * into 429s and left resources stuck without a count.
 *
 * `filesCount` does not exist, so bulk media (`IMAGES`) stays `DEFERRED`: its
 * number is confirmed at selection time (the estimator cannot page the whole
 * media library just to guess a total).
 */
const SHOPIFY_COUNT_FIELDS: Record<string, string> = {
  PRODUCTS: "productsCount",
  ORDERS: "ordersCount",
  CUSTOMERS: "customersCount",
  PAGES: "pagesCount",
  BLOGS: "blogsCount",
  COUPONS: "discountNodesCount",
};

const SHOPIFY_COUNT_QUERY = `
  query EstimateCounts {
    productsCount { count precision }
    customersCount { count precision }
    ordersCount(limit: null) { count precision }
    pagesCount { count precision }
    blogsCount { count precision }
    discountNodesCount(limit: null) { count precision }
    blogs(first: ${MAX_BLOGS}) {
      pageInfo { hasNextPage }
      edges {
        node {
          id
          articlesCount(limit: null) { count precision }
        }
      }
    }
  }
`;

interface ShopifyCountNode {
  count?: number | null;
  precision?: string | null;
}

interface ShopifyCountsPayload {
  data?: Record<string, unknown> | null;
  errors?: Array<{ message?: string; path?: Array<string | number> }>;
}

/** Tooltip-friendly copy: GraphQL scope errors are long. */
function trimReason(reason: string): string {
  return reason.length > 180 ? `${reason.slice(0, 177)}…` : reason;
}

/** Field-level GraphQL error for a count (e.g. a missing access scope). */
function fieldReason(
  field: string,
  errors: ShopifyCountsPayload["errors"],
): string | null {
  const match = errors?.find(
    (error) => error.path?.[0] === field || (error.message ?? "").includes(field),
  );

  return match?.message ? trimReason(match.message) : null;
}

function readShopifyCount(
  data: ShopifyCountsPayload["data"],
  field: string,
  errors: ShopifyCountsPayload["errors"],
): RawCount {
  const node = (data?.[field] ?? null) as ShopifyCountNode | null;
  const count = node?.count;

  if (typeof count !== "number") {
    return unavailable(
      fieldReason(field, errors) ?? `Shopify did not return a ${field} value`,
    );
  }

  return counted(count, node?.precision !== "ESTIMATED");
}

interface ShopifyToken {
  value: string | null;
  reason: string | null;
}

/** Access token for a shop, refreshing it when the stored one has expired. */
async function resolveShopifyToken(shopDomain: string): Promise<ShopifyToken> {
  const rows = (await pool.query(
    `SELECT s."accessToken", s."refreshToken", s."expires", sc.status
     FROM shopify."Session" s
     JOIN shopify_connections sc ON sc.shop_domain = s.shop
     WHERE s.shop = $1`,
    [shopDomain],
  )) as Array<{
    accessToken: string;
    refreshToken: string;
    expires: string;
    status: string | null;
  }>;

  const credential = rows[0];
  if (!credential) {
    return { value: null, reason: "Shopify store is not connected" };
  }

  if (credential.status && credential.status !== "CONNECTED") {
    return { value: null, reason: "Shopify connection is not active" };
  }

  if (Date.now() < new Date(credential.expires).getTime()) {
    return { value: credential.accessToken, reason: null };
  }

  try {
    const refreshed = await refreshShopifyAccessToken(
      shopDomain,
      credential.refreshToken,
    );

    await pool.query(
      `UPDATE shopify."Session"
       SET "accessToken" = $1, "refreshToken" = $2,
           "expires" = NOW() + ($3 * interval '1 second'),
           "refreshTokenExpires" = NOW() + ($4 * interval '1 second')
       WHERE shop = $5`,
      [
        refreshed.access_token,
        refreshed.refresh_token,
        refreshed.expires_in,
        refreshed.refresh_token_expires_in,
        shopDomain,
      ],
    );

    return { value: refreshed.access_token, reason: null };
  } catch (error) {
    console.error("[estimate] Shopify token refresh failed:", error);
    return {
      value: null,
      reason: "Shopify access token could not be refreshed",
    };
  }
}

/** Shopify-side counts for every resource the dashboard can show. */
async function fetchShopifyCounts(
  project: string,
): Promise<Record<string, RawCount>> {
  const token = await resolveShopifyToken(project);

  if (!token.value) {
    return allUnavailable(
      "shopify_to_wp",
      token.reason ?? "Shopify store is not connected",
    );
  }

  const gate = gateFor(`shopify:${project}`, SHOPIFY_REQUEST_GAP_MS);

  let payload: ShopifyCountsPayload;
  try {
    const response = await pacedFetch(
      `https://${project}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token.value,
        },
        body: JSON.stringify({ query: SHOPIFY_COUNT_QUERY }),
        cache: "no-store",
      },
      { gate },
    );

    if (!response.ok) {
      return allUnavailable(
        "shopify_to_wp",
        `Shopify responded ${response.status} to the count request`,
      );
    }

    payload = (await response.json()) as ShopifyCountsPayload;
  } catch (error) {
    console.error("[estimate] Shopify count request failed:", error);
    return allUnavailable(
      "shopify_to_wp",
      "Shopify could not be reached for counting",
    );
  }

  const { data = null, errors } = payload;
  const counts: Record<string, RawCount> = {};

  for (const [resource, field] of Object.entries(SHOPIFY_COUNT_FIELDS)) {
    counts[resource] = readShopifyCount(data, field, errors);
  }

  counts.ARTICLES = readShopifyArticleCount(data, errors);
  counts.IMAGES = deferred(
    "Shopify has no store-wide media count — the image total is confirmed when you pick the files to export.",
  );

  return counts;
}

/** Articles are counted per blog; the same response already carries them. */
function readShopifyArticleCount(
  data: ShopifyCountsPayload["data"],
  errors: ShopifyCountsPayload["errors"],
): RawCount {
  const blogs = data?.blogs as
    | {
        pageInfo?: { hasNextPage?: boolean };
        edges?: Array<{ node?: { articlesCount?: ShopifyCountNode | null } }>;
      }
    | null
    | undefined;

  if (!blogs?.edges) {
    return unavailable(
      fieldReason("blogs", errors) ??
        "Shopify did not return the blog list for counting",
    );
  }

  const nodes = blogs.edges.map((edge) => edge?.node?.articlesCount ?? null);
  const articleCounts = nodes.map((node) => node?.count);

  if (articleCounts.some((count) => typeof count !== "number")) {
    return unavailable("Shopify did not return an article count for every blog");
  }

  const total = articleCounts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
  const capped =
    blogs.pageInfo?.hasNextPage === true ||
    nodes.some((node) => node?.precision === "ESTIMATED");

  return capped
    ? counted(total, false, `Counted the first ${MAX_BLOGS} blogs`)
    : counted(total);
}

/* ------------------------------------------------------------------ */
/* WordPress counters (connector totals + X-WP-Total headers)          */
/* ------------------------------------------------------------------ */

interface WpCredentials {
  siteUrl?: string;
  connectorToken?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
}

/** [resource key, connector path] — `per_page=1` keeps the payload tiny. */
const MMC_RESOURCES_TO_COUNT: Array<[string, string]> = [
  ["POSTS", "posts"],
  ["PAGES", "pages"],
  ["MEDIA", "media"],
  ["CATEGORIES", "terms?taxonomy=category"],
];

/** [resource key, WooCommerce REST path] — count rides on `X-WP-Total`. */
const WOO_RESOURCES_TO_COUNT: Array<[string, string]> = [
  ["PRODUCTS", "products"],
  ["ORDERS", "orders"],
  ["CUSTOMERS", "customers"],
  ["COUPONS", "coupons"],
];

/**
 * One connector list call, `per_page=1`, reading `pagination.total`.
 * Requests are awaited in sequence (never `Promise.all`): the store we are
 * counting is the merchant's own server and it deserves to be walked, not
 * flooded.
 */
async function countConnectorResource(
  base: string,
  path: string,
  token: string,
  gate: RequestGate,
): Promise<RawCount> {
  const separator = path.includes("?") ? "&" : "?";

  try {
    const response = await pacedFetch(
      `${base}/migration-master/v1/${path}${separator}per_page=1`,
      {
        headers: { "X-Migration-Master-Token": token },
        cache: "no-store",
      },
      { gate },
    );

    if (!response.ok) {
      return unavailable(`WordPress connector responded ${response.status}`);
    }

    const data = (await response.json()) as {
      pagination?: { total?: number };
    };
    const total = data.pagination?.total;

    return typeof total === "number"
      ? counted(total)
      : unavailable("WordPress connector did not return a total");
  } catch {
    return unavailable("WordPress connector could not be reached");
  }
}

/** One WooCommerce list call, `per_page=1`, reading the `X-WP-Total` header. */
async function countWooResource(
  base: string,
  path: string,
  basicAuth: string,
  gate: RequestGate,
): Promise<RawCount> {
  try {
    const response = await pacedFetch(
      `${base}/wc/v3/${path}?per_page=1`,
      { headers: { Authorization: `Basic ${basicAuth}` }, cache: "no-store" },
      { gate },
    );

    if (!response.ok) {
      return unavailable(`WooCommerce responded ${response.status}`);
    }

    const total = Number(response.headers.get("X-WP-Total"));

    return Number.isFinite(total)
      ? counted(total)
      : unavailable("WooCommerce did not return a total");
  } catch {
    return unavailable("WooCommerce could not be reached");
  }
}

/** WordPress/WooCommerce counts for every resource the dashboard can show. */
async function fetchWordPressCounts(
  project: string,
): Promise<Record<string, RawCount>> {
  const rows = (await pool.query(
    `SELECT source_credentials FROM migration_connections
     WHERE project_name = $1 AND source_platform = 'WordPress'
       AND destination_platform = 'Shopify' LIMIT 1`,
    [project],
  )) as Array<{ source_credentials?: WpCredentials }>;

  const credentials = rows[0]?.source_credentials;
  if (!credentials?.siteUrl) {
    return allUnavailable(
      "wp_to_shopify",
      "WordPress is not connected for this project",
    );
  }

  const domain = credentials.siteUrl.replace(/^https?:\/\//, "");
  const base = `https://${domain}/wp-json`;
  const gate = gateFor(`wordpress:${domain}`, WORDPRESS_REQUEST_GAP_MS);
  const counts: Record<string, RawCount> = {};

  if (credentials.connectorToken) {
    for (const [resource, path] of MMC_RESOURCES_TO_COUNT) {
      counts[resource] = await countConnectorResource(
        base,
        path,
        credentials.connectorToken,
        gate,
      );
    }
  } else {
    for (const [resource] of MMC_RESOURCES_TO_COUNT) {
      counts[resource] = unavailable(
        "Migration Master connector is not installed on this site",
      );
    }
  }

  if (credentials.wooConsumerKey && credentials.wooConsumerSecret) {
    const basicAuth = Buffer.from(
      `${credentials.wooConsumerKey}:${credentials.wooConsumerSecret}`,
    ).toString("base64");

    for (const [resource, path] of WOO_RESOURCES_TO_COUNT) {
      counts[resource] = await countWooResource(base, path, basicAuth, gate);
    }
  } else {
    for (const [resource] of WOO_RESOURCES_TO_COUNT) {
      counts[resource] = unavailable(
        "WooCommerce REST keys are not saved for this site",
      );
    }
  }

  return counts;
}





