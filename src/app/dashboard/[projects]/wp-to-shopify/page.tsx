"use client";

import { useProjectContext } from "@/context";
import {
  MMC_RESOURCES,
  WOO_RESOURCES,
  WordPressResource,
  WordPressService,
} from "@/lib/sharedResources";
import { isShopifyProject } from "@/lib/dashboard-routes";
import {
  ExternalLinkIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  NewspaperIcon,
  ShoppingCartIcon,
  TagsIcon,
  Ticket,
  TriangleAlert,
  UsersIcon,
} from "lucide-react";
import { ElementType, ReactNode, useCallback, useEffect, useState } from "react";
import { cachedData, cleanExpiredCache } from "@/lib/cache";
import { AssetCard } from "@/components/asset-card";

const WORDPRESS_RESOURCE_CONFIG: Record<WordPressResource, WordPressService> = {
  posts: {
    type: "posts",
    label: "Posts",
    description: "Blog posts published on your WordPress site",
    icon: NewspaperIcon,
    accent: "bg-purple-500/10 text-purple-600",
  },

  pages: {
    type: "pages",
    label: "Pages",
    description: "Static pages on your WordPress site",
    icon: FileTextIcon,
    accent: "bg-blue-500/10 text-blue-600",
  },

  media: {
    type: "media",
    label: "Media",
    description: "Images and other media files from your WordPress site",
    icon: ImageIcon,
    accent: "bg-orange-500/10 text-orange-600",
  },

  categories: {
    type: "categories",
    label: "Categories & Tags",
    description: "Categories, tags, and other taxonomy terms",
    icon: TagsIcon,
    accent: "bg-teal-500/10 text-teal-600",
  },

  products: {
    type: "products",
    label: "Products",
    description: "Export your WooCommerce product catalog",
    icon: ShoppingCartIcon,
    accent: "bg-pink-500/10 text-pink-600",
  },

  orders: {
    type: "orders",
    label: "Orders",
    description: "Customer orders placed through WooCommerce",
    icon: ShoppingCartIcon,
    accent: "bg-green-500/10 text-green-600",
  },

  customers: {
    type: "customers",
    label: "Customers",
    description: "Export WooCommerce customer profiles and addresses",
    icon: UsersIcon,
    accent: "bg-teal-500/10 text-teal-600",
  },

  coupons: {
    type: "coupons",
    label: "Coupons",
    description: "WooCommerce discount and coupon codes",
    icon: Ticket,
    accent: "bg-amber-500/10 text-amber-600",
  },
};

type ConnectionStatusTag =
  | "Checking..."
  | "Connected"
  | "Pending"
  | "Not Connected";

const CONNECTION_STATUS_STYLES: Record<ConnectionStatusTag, string> = {
  "Checking...": "text-primary/60",
  Connected: "text-green-400",
  Pending: "text-amber-400",
  "Not Connected": "text-red-400",
};

interface ShopifyImportConnection {
  id: string | null;
  projectName: string | null;
  shopDomain: string | null;
  status: string | null;
  connected: boolean;
  channelProvisioned?: boolean;
  connectUrl: string | null;
  credentials?: Record<string, unknown> | null;
}

export default function WpToShopifyDashboard() {
  const { activeProject, wordPressData, setWordPressData } =
    useProjectContext();
  const isSuitableProject = !isShopifyProject(activeProject);
  const [wpStatus, setWpStatus] = useState<ConnectionStatusTag>("Checking...");
  const [wpChecking, setWpChecking] = useState<boolean>(true);
  const [shopifyStatus, setShopifyStatus] =
    useState<ConnectionStatusTag>("Checking...");
  const [shopifyChecking, setShopifyChecking] = useState<boolean>(true);
  const [shopifyConnection, setShopifyConnection] =
    useState<ShopifyImportConnection | null>(null);

  useEffect(() => {
    cleanExpiredCache({ prefix: "wp-cache:", session_Storage: true });
  }, []);

  const WP_STATUS_TTL = 30 * 1000;
  const SHOPIFY_CONNECTION_TTL = 30 * 1000;

  const checkWordPressConnection = useCallback(async (force = false) => {
    if (!activeProject || !isSuitableProject) return;

    setWpChecking(true);

    try {
      // Short-lived cache so toggling between services / revisiting the page
      // doesn't re-hit the status API on every mount. `force` bypasses it.
      const { response: data } = await cachedData<
        { source_status?: boolean },
        [string]
      >({
        key: `wp-cache:conn-wp-status:${activeProject}`,
        fn: async () => {
          const res = await fetch("/api/wordpress/wordpress-connector/status", {
            headers: {
              "x-site": activeProject,
              "Content-Type": "Application/json",
            },
          });

          if (!res.ok) {
            throw new Error("Failed to verify WordPress connection");
          }

          return res.json() as Promise<{ source_status?: boolean }>;
        },
        args: [activeProject],
        session_Storage: true,
        ttl: WP_STATUS_TTL,
        useCache: !force,
      });

      setWpStatus(data.source_status === true ? "Connected" : "Not Connected");
    } catch (error) {
      console.error("WordPress connection check failed:", error);
      setWpStatus("Not Connected");
    } finally {
      setWpChecking(false);
    }
  }, [activeProject, isSuitableProject]);

  const checkShopifyConnection = useCallback(async (force = false) => {
    if (!activeProject || !isSuitableProject) return;

    setShopifyChecking(true);

    try {
      const { response: data } = await cachedData<
        ShopifyImportConnection,
        [string]
      >({
        key: `wp-cache:conn-shopify:${activeProject}`,
        fn: async () => {
          const res = await fetch(
            `/api/shopify/import-connection?project=${encodeURIComponent(
              activeProject,
            )}`,
          );

          if (!res.ok) {
            throw new Error("Failed to load the Shopify destination");
          }

          return res.json() as Promise<ShopifyImportConnection>;
        },
        args: [activeProject],
        session_Storage: true,
        ttl: SHOPIFY_CONNECTION_TTL,
        useCache: !force,
      });

      setShopifyConnection(data);

      let nextStatus: ConnectionStatusTag = "Not Connected";

      if (data.connected) {
        nextStatus = "Connected";
      } else if (data.status === "PENDING") {
        nextStatus = "Pending";
      }

      setShopifyStatus(nextStatus);
    } catch (error) {
      console.error("Shopify connection check failed:", error);
      setShopifyConnection(null);
      setShopifyStatus("Not Connected");
    } finally {
      setShopifyChecking(false);
    }
  }, [activeProject, isSuitableProject]);

  useEffect(() => {
    checkWordPressConnection();
    checkShopifyConnection();
  }, [checkWordPressConnection, checkShopifyConnection]);

  // Live hand-off detection: the merchant completes Shopify OAuth in another
  // tab (the Connect link opens target="_blank"), so nothing pushes the flip
  // back to this dashboard — poll only while actually pending, and force a
  // fresh (cache-bypassing) check on window focus instead of requiring a
  // manual reload.
  useEffect(() => {
    if (
      !activeProject ||
      !isSuitableProject ||
      shopifyStatus === "Connected"
    ) {
      return;
    }

    const pollFresh = () => checkShopifyConnection(true);

    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      if (!timer) timer = setInterval(pollFresh, 5000);
    };
    const onVisibility = () =>
      document.visibilityState === "visible" ? start() : stop();

    // Only poll while OAuth is actually in-flight ("Pending"); a plain
    // "Not Connected" destination would otherwise hit the API every 5s forever.
    if (shopifyStatus === "Pending") {
      start();
    }

    window.addEventListener("focus", pollFresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("focus", pollFresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    activeProject,
    isSuitableProject,
    shopifyStatus,
    checkShopifyConnection,
  ]);

  if (!activeProject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-primary/60">
        <TriangleAlert size={48} className="mb-4 text-primary/40" />
        <h2 className="mb-2 text-xl font-semibold text-primary/80">
          No project selected
        </h2>
        <p className="max-w-md text-center text-sm">
          Pick a project from the sidebar to load the migration dashboard.
        </p>
      </div>
    );
  }

  if (!isSuitableProject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-primary/60">
        <TriangleAlert size={48} className="mb-4 text-amber-500/60" />
        <h2 className="mb-2 text-xl font-semibold text-primary/80">
          Migration path is not suitable for this project
        </h2>
        <p className="max-w-md text-center text-sm">
          WordPress to Shopify exports are only available for connected
          WordPress sites.
        </p>
      </div>
    );
  }

  const shopifyConnectUrl = shopifyConnection?.connectUrl ?? null;

  async function fetchResource(resource: WordPressResource) {
    if (!activeProject) return false;

    async function fetchFromApi(project: string, res: WordPressResource) {
      const response = await fetch(`/api/wordpress/${res}/fetch`, {
        headers: {
          "x-projectName": project,
          asset: res,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${res}`);
      }

      return response.json() as Promise<any[]>;
    }

    try {
      const { response: items } = await cachedData<
        any[],
        [string, WordPressResource]
      >({
        key: `wp-cache:${activeProject}:${resource}`,
        fn: fetchFromApi,
        args: [activeProject, resource],
        ttl: 10 * 60 * 1000,
        session_Storage: true,
        useCache: true,
        useCrypto: resource === "customers" || resource === "orders",
      });

      setWordPressData((prev) => ({
        ...prev,
        [resource]: items,
      }));

      return true;
    } catch (error) {
      console.error("Error fetching data", error);
      return false;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            WordPress → Shopify
          </h1>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            Choose what to export from your WordPress site.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionChip
            label="WordPress Source"
            status={wpStatus}
            busy={wpChecking}
            action={
              <button
                type="button"
                onClick={() => {
                  if (!wpChecking) checkWordPressConnection();
                }}
                disabled={wpChecking}
                title="Re-check WordPress connection"
                className="rounded-md p-1 text-primary/30 transition-colors hover:bg-primary/5 hover:text-primary/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Loader2Icon
                  size={13}
                  className={wpChecking ? "animate-spin" : ""}
                />
              </button>
            }
          />

          <ConnectionChip
            label="Shopify Destination"
            status={shopifyStatus}
            busy={shopifyChecking}
            title={shopifyConnection?.shopDomain ?? undefined}
            action={
              <div className="flex items-center gap-0.5">
                {shopifyStatus === "Pending" && shopifyConnectUrl && (
                  <a
                    href={shopifyConnectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Approve app access on Shopify"
                    className="inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-medium leading-5 text-primary transition-colors hover:bg-primary/10"
                  >
                    Connect
                    <ExternalLinkIcon size={11} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!shopifyChecking) checkShopifyConnection();
                  }}
                  disabled={shopifyChecking}
                  title="Re-check Shopify connection"
                  className="rounded-md p-1 text-primary/30 transition-colors hover:bg-primary/5 hover:text-primary/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Loader2Icon
                    size={13}
                    className={shopifyChecking ? "animate-spin" : ""}
                  />
                </button>
              </div>
            }
          />
        </div>
      </div>

      {shopifyStatus === "Pending" && (
        <p className="-mt-1 mb-2 flex items-center gap-1.5 text-[11px] font-medium text-primary/45">
          <Loader2Icon size={11} className="animate-spin" />
          {shopifyConnection?.channelProvisioned === false
            ? "Channel provisioning missing on Migration Master side — re-save the project to backfill."
            : "Waiting on Shopify approval — this panel refreshes automatically once you approve."}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...MMC_RESOURCES, ...WOO_RESOURCES].map((assetType) => {
          const type = assetType.toLocaleLowerCase() as WordPressResource;
          const config = WORDPRESS_RESOURCE_CONFIG[type];
          const count = (wordPressData[assetType] as any[]).length;

          return (
            <WpAssetCard
              key={assetType}
              type={assetType}
              label={config.label}
              description={config.description}
              icon={config.icon}
              accent={config.accent}
              count={count}
              activeProject={activeProject}
              fetchResource={fetchResource}
            />
          );
        })}
      </div>
    </div>
  );
}

function WpAssetCard({
  type,
  label,
  description,
  icon: Icon,
  accent,
  count,
  activeProject,
  fetchResource,
}: {
  type: WordPressResource;
  label: string;
  description: string;
  icon: ElementType;
  accent: string;
  count: number;
  activeProject: string;
  fetchResource: (resource: WordPressResource) => Promise<boolean>;
}) {
  const [assetLoading, setAssetLoading] = useState(false);

  return (
    <AssetCard
      type={type}
      label={label}
      description={description}
      icon={({ className }: { className?: string }) => (
        <Icon size={20} className={className} />
      )}
      accent={accent}
      count={assetLoading ? null : count}
      isLoading={assetLoading}
      onFetch={async () => {
        setAssetLoading(true);
        const done = await fetchResource(type);
        if (done) setAssetLoading(false);
      }}
      exportHref={`/dashboard/${encodeURIComponent(activeProject)}/export/${WORDPRESS_RESOURCE_CONFIG[type].type}`}
    />
  );
}

function ConnectionChip({
  label,
  status,
  busy,
  action,
  title,
}: {
  label: string;
  status: ConnectionStatusTag;
  busy?: boolean;
  action?: ReactNode;
  title?: string;
}) {
  const tone = CONNECTION_STATUS_STYLES[busy ? "Checking..." : status];

  return (
    <div
      title={title}
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-primary/10 bg-background py-1 pl-2.5 pr-1.5 text-xs shadow-sm"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {status === "Connected" && !busy && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${tone} opacity-60`}
          />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone} ${
            busy ? "animate-pulse" : ""
          }`}
        />
      </span>

      <span className="font-medium text-primary/60">{label}</span>

      <span className={`font-medium tracking-tight ${tone}`}>
        {busy ? "Checking..." : status}
      </span>

      <span className="h-3 w-px bg-primary/10" />

      {action}
    </div>
  );
}
