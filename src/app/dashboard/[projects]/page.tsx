"use client";

import { useProjectContext } from "@/context";
import {
  FileTextIcon,
  NewspaperIcon,
  ShoppingCartIcon,
  PenSquareIcon,
  Loader2Icon,
  ArrowRightIcon,
  Layers,
  Image,
} from "lucide-react";
import { useState, type ElementType } from "react";
import { Resurces } from "@/app/api/shopify/[resources]/fetch/route";
import { useRouter } from "next/navigation";

const ResourceTypes = {
  PAGES: "pages",
  BLOGS: "blogs",
  ORDERS: "orders",
  ARTICLES: "articles",
  SINGLE_ARTICLE: "single_article",
  IMAGES: "images",
} as const satisfies Record<string, Resurces>;

export type ResourceKey = keyof typeof ResourceTypes;

type Services = {
  label: string;
  type: Resurces;
  description: string;
  icon: ElementType;
  accent: string;
};

const RESOURCE_CONFIG: Record<ResourceKey, Services> = {
  PAGES: {
    label: "Pages",
    type: "pages",
    description: "Static pages on your storefront",
    icon: FileTextIcon,
    accent: "bg-blue-500/10 text-blue-600",
  },
  BLOGS: {
    label: "Blogs",
    type: "blogs",
    description: "Blog collections in your store",
    icon: NewspaperIcon,
    accent: "bg-purple-500/10 text-purple-600",
  },
  ORDERS: {
    label: "Orders",
    type: "orders",
    description: "Customer orders placed",
    icon: ShoppingCartIcon,
    accent: "bg-green-500/10 text-green-600",
  },
  ARTICLES: {
    label: "Articles / Blog Posts",
    type: "articles",
    description: "Get all articles across blogs",
    icon: Layers,
    accent: "bg-orange-500/10 text-orange-600",
  },
  SINGLE_ARTICLE: {
    type: "single_article",
    label: "Unique Article/Blog",
    description: "Get single article when ID is provided",
    icon: PenSquareIcon,
    accent: "bg-fuchsia-500/10 text-fuchsia-600",
  },
  IMAGES: {
    type: "images",
    label: "All Images",
    description: "Export metadata of your all images",
    icon: Image,
    accent: "bg-neon-500/10 text-neon-600",
  },
};

const RESOURCE_KEYS = Object.keys(ResourceTypes) as ResourceKey[];

export default function Dashboard() {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [blogIdInputs, setBlogIdInputs] = useState<Record<string, string>>({});

  const { activeProject, shopifyData, setShopifyData } = useProjectContext();
  const router = useRouter();

  async function getResources(type: ResourceKey, post_id?: string) {
    if (!activeProject) return;

    setLoadingMap((prev) => ({
      ...prev,
      [type]: true,
    }));

    try {
      const resourceValue = ResourceTypes[type];

      // if single blog post id is provided we can do conditional fetch
      let res;

      if (!post_id) {
        res = await fetch(
          `/api/shopify/${resourceValue}/fetch?shop=${encodeURIComponent(
            activeProject,
          )}`,
        );
      } else {
        res = await fetch(
          `/api/shopify/${resourceValue}/fetch?shop=${encodeURIComponent(
            activeProject,
          )}&blogId=${encodeURIComponent(post_id)}`,
        );
      }

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">
          Export Shopify Contents
        </h2>

        <p className="mt-1 text-sm text-primary/50">
          Fetch the latest data for each resource below.
        </p>
      </div>

      <div className="grid grid-cols-1 bg- gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    className="text-xs font-semibold text-blue-500 hover:underline cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/${activeProject}/export/${RESOURCE_CONFIG[type].type}`,
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
                    {count} item
                    {count === 1 ? "" : "s"} loaded
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
                    // type in shopifyData
                  }
                  className="inline-flex disabled:text-muted-foreground items-center gap-1 rounded-md border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
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
