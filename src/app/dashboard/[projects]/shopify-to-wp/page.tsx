"use client";

import { useProjectContext } from "@/context";
import { Loader2Icon, ArrowRightIcon, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isShopifyProject } from "@/lib/dashboard-routes";
import {
  RESOURCE_CONFIG,
  RESOURCE_KEYS,
  ResourceKey,
  ResourceTypes,
} from "@/lib/sharedResources";

export default function ShopifyToWpDashboard() {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [blogIdInputs, setBlogIdInputs] = useState<Record<string, string>>({});
  const { activeProject, shopifyData, setShopifyData } = useProjectContext();
  const router = useRouter();

  const isSuitableProject = isShopifyProject(activeProject);

  async function getResources(type: ResourceKey, post_id?: string) {
    if (!activeProject) return;

    setLoadingMap((prev) => ({
      ...prev,
      [type]: true,
    }));

    try {
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
        throw new Error(error?.message || `Failed to fetch ${resourceValue}`);
      }

      const data = await res.json();

      setShopifyData((prev) => ({
        ...prev,
        [type]: data,
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
          Shopify to WordPress exports are only available for connected Shopify
          stores.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">
          Export Shopify Contents
        </h2>

        <p className="mt-1 text-sm text-primary/50">
          Fetch data for each resource type and prepare individual WordPress
          import files.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESOURCE_KEYS.map((type) => {
          const {
            label,
            description,
            icon: Icon,
            accent,
          } = RESOURCE_CONFIG[type];
          const isLoading = loadingMap[type] ?? false;
          const data = shopifyData[type];
          const single_blog_post = label === "Blog Posts Single";
          const blogIdValue = blogIdInputs[type] ?? "";

          const count = Array.isArray(data)
            ? data.length
            : data && typeof data === "object"
              ? Object.keys(data).length
              : null;

          return (
            <div
              key={type}
              className="group relative flex flex-col gap-4 rounded-xl border border-primary/10 bg-background p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
                >
                  <Icon size={20} />
                </div>

                {isLoading && (
                  <Loader2Icon
                    size={16}
                    className="animate-spin text-primary/40"
                  />
                )}

                {!isLoading && (data as any) && (
                  <span
                    className="cursor-pointer text-xs font-semibold text-blue-500 hover:underline"
                    onClick={() =>
                      router.push(
                        `/dashboard/${encodeURIComponent(
                          activeProject,
                        )}/export/${RESOURCE_CONFIG[type].type}`,
                      )
                    }
                  >
                    Export
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium">{label}</h3>
                <p className="text-xs leading-relaxed text-primary/50">
                  {description}
                </p>
              </div>

              {single_blog_post && (
                <input
                  type="text"
                  value={blogIdValue}
                  onChange={(e) =>
                    setBlogIdInputs((prev) => ({
                      ...prev,
                      [type]: e.target.value,
                    }))
                  }
                  placeholder="Blog ID"
                  className="w-full rounded-sm border border-primary/10 bg-primary/5 px-2 py-1 text-xs outline-none transition-colors focus:border-primary/30"
                />
              )}

              <div className="mt-auto flex items-center justify-between pt-2">
                {count !== null ? (
                  <span className="text-xs font-medium text-primary/70">
                    {count} item{count === 1 ? "" : "s"} loaded
                  </span>
                ) : (
                  <span className="text-xs text-primary/30">No data yet</span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    getResources(
                      type,
                      single_blog_post ? blogIdValue : undefined,
                    )
                  }
                  disabled={
                    isLoading || (single_blog_post && !blogIdValue.trim())
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted-foreground"
                >
                  {isLoading ? (
                    "Loading..."
                  ) : (
                    <>
                      Fetch
                      <ArrowRightIcon
                        size={12}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
