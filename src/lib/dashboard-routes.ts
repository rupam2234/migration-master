export const SHOPIFY_TO_WP_PATH = "shopify-to-wp" as const;
export const WP_TO_SHOPIFY_PATH = "wp-to-shopify" as const;

export type DashboardChildPath =
  | typeof SHOPIFY_TO_WP_PATH
  | typeof WP_TO_SHOPIFY_PATH
  | "export-jobs"
  | "settings"
  | "export";

export const DEFAULT_DASHBOARD_PATH: DashboardChildPath = SHOPIFY_TO_WP_PATH;

export function getDashboardProjectPath(
  project: string,
  childPath: DashboardChildPath = DEFAULT_DASHBOARD_PATH,
) {
  return `/dashboard/${encodeURIComponent(project)}/${childPath}`;
}

export function buildDashboardProjectPath(
  project: string,
  pathname?: string,
  currentProject?: string | null,
) {
  const basePath = getDashboardProjectPath(project);

  if (!pathname || !pathname.startsWith("/dashboard")) {
    return basePath;
  }

  if (currentProject) {
    const currentPrefix = `/dashboard/${encodeURIComponent(currentProject)}`;

    if (pathname.startsWith(currentPrefix)) {
      const suffix = pathname.slice(currentPrefix.length);
      return suffix ? `/dashboard/${encodeURIComponent(project)}${suffix}` : basePath;
    }
  }

  return basePath;
}

export function isShopifyProject(project: string | null) {
  if (!project) return false;

  return project.includes("myshopify");
}

/**
 * Returns the migration child path segment from a dashboard pathname
 * (e.g. "shopify-to-wp", "wp-to-shopify", "settings", ...).
 */
export function getDashboardChildPathFromPathname(
  pathname?: string | null,
): DashboardChildPath | null {
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean); // ["dashboard", "{project}", ...]

  if (segments.length < 3 || segments[0] !== "dashboard") return null;

  const child = segments[2];

  return (DASHBOARD_CHILD_PATHS as readonly string[]).includes(child)
    ? (child as DashboardChildPath)
    : null;
}

const DASHBOARD_CHILD_PATHS = [
  SHOPIFY_TO_WP_PATH,
  WP_TO_SHOPIFY_PATH,
  "export-jobs",
  "settings",
  "export",
] as const;

/**
 * Whether a project can be used with the given migration path:
 * - "shopify-to-wp" only accepts Shopify stores.
 * - "wp-to-shopify" only accepts WordPress sites.
 * - Other paths accept any project.
 */
export function isProjectSuitableForPath(
  project: string | null,
  childPath: DashboardChildPath | null,
) {
  if (!project) return false;

  if (childPath === SHOPIFY_TO_WP_PATH) return isShopifyProject(project);
  if (childPath === WP_TO_SHOPIFY_PATH) return !isShopifyProject(project);

  return true;
}

/**
 * Filters a list of projects down to those suitable for the migration path.
 */
export function getSuitableProjects(
  projects: string[] | null | undefined,
  childPath: DashboardChildPath | null,
) {
  if (!projects) return [];

  return projects.filter((project) =>
    isProjectSuitableForPath(project, childPath),
  );
}
