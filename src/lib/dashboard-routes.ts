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

  if (project.includes("myshopify")) {
    return true;
  } else {
    false;
  }
}
