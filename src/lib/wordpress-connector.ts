import crypto from "crypto";

export const WORDPRESS_SOURCE_PLATFORM = "WordPress";
export const SHOPIFY_DESTINATION_PLATFORM = "Shopify";

export type WordPressConnectorState =
  | "PENDING_CONNECTOR"
  | "CONNECTED"
  | "DISCONNECTED";

export interface WordPressConnectorCredentials {
  connectorTokenHash: string;
  connectorState: WordPressConnectorState;
  connectorVersion: string;
  createdAt?: string;
  connectedAt?: string;
  siteUrl?: string;
  siteName?: string;
  restUrl?: string;
  adminUrl?: string;
  wpVersion?: string;
  pluginVersion?: string;
}

export function normalizePlatformName(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function isWordPressToShopifyFlow(
  sourcePlatform?: string | null,
  destinationPlatform?: string | null,
) {
  return (
    normalizePlatformName(sourcePlatform) === "wordpress" &&
    normalizePlatformName(destinationPlatform) === "shopify"
  );
}

export function generateWordPressConnectorToken() {
  return `mmwp_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashWordPressConnectorToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildWordPressConnectorCredentials(token: string) {
  const tokenHash = hashWordPressConnectorToken(token);

  return {
    connectorTokenHash: tokenHash,
    connectorState: "PENDING_CONNECTOR" as WordPressConnectorState,
    connectorVersion: "1.0.0",
    createdAt: new Date().toISOString(),
  };
}

