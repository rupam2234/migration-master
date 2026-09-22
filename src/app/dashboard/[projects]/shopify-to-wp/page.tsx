"use client";

import { useProjectContext } from "@/context";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { isShopifyProject } from "@/lib/dashboard-routes";
import {
  RESOURCE_CONFIG,
  RESOURCE_KEYS,
  ResourceKey,
  ResourceTypes,
  requiresScope,
  scopeStorageKey,
} from "@/lib/sharedResources";
import { cachedData } from "@/lib/cache";
import { AssetCard } from "@/components/asset-card";

export default function ShopifyToWpDashboard() {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [blogIdInputs, setBlogIdInputs] = useState<Record<string, string>>({});
  const { activeProject, shopifyData, setShopifyData } = useProjectContext();

  const isSuitableProject = isShopifyProject(activeProject);

  async function getResources(type: ResourceKey, post_id?: string) {
    if (!activeProject) return;

    // Remember the scope (blog id) so the export screen can rebuild the exact
    // same record set server-side.
    if (post_id && requiresScope(type)) {
      sessionStorage.setItem(scopeStorageKey(activeProject, type), post_id);
    }

    setLoadingMap((prev) => ({
      ...prev,
      [type]: true,
    }));

    try {
      const { response: items } = await cachedData<
        any[],
        [string, ResourceKey]
      >({
        fn: async () => {
          const resourceValue = ResourceTypes[type];
          const endpoint = post_id
            ? `/api/shopify/${resourceValue}/fetch?shop=${encodeURIComponent(
                activeProject,
              )}&blogId=${encodeURIComponent(post_id)}`
            : `/api/shopify/${resourceValue}/fetch?shop=${encodeURIComponent(
                activeProject,
              )}`;

          const res = await fetch(endpoint);

          if (!res.ok) {
            const error = await res.json().catch(() => null);
            throw new Error(
              error?.message || `Failed to fetch ${resourceValue}`,
            );
          }

          return res.json() as Promise<any[]>;
        },
        key: `shopif_asset_cache:${activeProject}-${type}`,
        session_Storage: true,
        ttl: 10 * 60 * 1000,
        args: [activeProject, type],
        useCache: true,
      });

      setShopifyData((prev) => ({
        ...prev,
        [type]: items,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to fetch ${type} data`;

      console.error(message);
    } finally {
      setLoadingMap((prev) => ({
        ...prev,
        [type]: false,
      }));
    }
  }

  const handleBlogIdChange = (type: ResourceKey, value: string) => {
    setBlogIdInputs((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  if (!activeProject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <TriangleAlert size={48} className="mb-4 text-muted-foreground/40" />
        <h2 className="mb-2 text-xl font-semibold text-foreground/80">
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <TriangleAlert
          size={48}
          className="mb-4 text-amber-500/60"
        />

        <h2 className="mb-2 text-xl font-semibold text-foreground/80">
          Wrong project type
        </h2>
        <p className="max-w-md text-center text-sm">
          This dashboard is for Shopify projects. Select a WordPress project for
          the reverse migration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="border-b border-border pb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Shopify → WordPress
            </h1>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              Choose what to export from your Shopify store.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {RESOURCE_KEYS.map((type) => {
          const config = RESOURCE_CONFIG[type];
          const data = shopifyData[type] || [];
          const isLoading = loadingMap[type];
          const blogIdValue = blogIdInputs[type] || "";

          return (
            <AssetCard
              key={type}
              type={type}
              label={config.label}
              description={config.description}
              icon={config.icon as React.ComponentType<{ className?: string }>}
              accent={config.accent}
              count={isLoading ? null : (data as any[]).length}
              isLoading={isLoading}
              onFetch={getResources}
              scoped={requiresScope(type)}
              blogIdValue={blogIdValue}
              onBlogIdChange={(value) => handleBlogIdChange(type, value)}
              exportHref={`/dashboard/${encodeURIComponent(activeProject)}/export/${ResourceTypes[type]}`}
            />
          );
        })}
      </div>
    </div>
  );
}
