"use client";

import { useProjectContext } from "@/context";
import { ArrowRight } from "lucide-react";
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
import { EstimateStrip } from "@/components/estimate-strip";
import { GlobalLoader } from "@/components";
import { useEstimates } from "@/hooks/use-estimates";
import { isBulkImageResource } from "@/lib/estimate-utils";

export default function ShopifyToWpDashboard() {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [blogIdInputs, setBlogIdInputs] = useState<Record<string, string>>({});
  const { activeProject, shopifyData, setShopifyData } = useProjectContext();
  const {
    estimates,
    totalCredits,
    loading: estimatesLoading,
    refreshing: estimatesRefreshing,
    partial: estimatesPartial,
    stale,
    refresh,
  } = useEstimates(activeProject);

  // Show loading state if project is still being initialized
  if (!activeProject) {
    return <GlobalLoader />;
  }

  function estimateFor(type: ResourceKey) {
    const entry = estimates[type];
    if (!entry) return null;
    return {
      ...entry,
      isFree: isBulkImageResource(type) && entry.credits === 0,
    };
  }

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

  if (!isSuitableProject) {
    return <GlobalLoader />;
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="border-b border-border pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Shopify → WordPress
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose what to export from your Shopify store.
            </p>
          </div>
          
          <button
            onClick={refresh}
            disabled={estimatesLoading}
            className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRight size={14} />
            {estimatesLoading ? "Estimating..." : "Re-estimate"}
          </button>
        </div>
      </div>

      <EstimateStrip
        totalCredits={totalCredits}
        loading={estimatesLoading}
        refreshing={estimatesRefreshing}
        partial={estimatesPartial}
        stale={stale}
        onRefresh={refresh}
      />

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
              estimate={estimateFor(type)}
              estimateLoading={estimatesLoading}
            />
          );
        })}
      </div>
    </div>
  );
}
