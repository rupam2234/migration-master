const DEFAULT_SITE_URL = "https://migrationmaster.online";

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;

  return raw.replace(/\/+$/, "");
}

export const SITE_URL = getSiteUrl();
