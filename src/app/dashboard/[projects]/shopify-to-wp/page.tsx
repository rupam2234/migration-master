"use client";

import { useProjectContext } from "@/context";
import {
  FileTextIcon,
  NewspaperIcon,
  ShoppingCartIcon,
  UsersIcon,
  Loader2Icon,
  ArrowRightIcon,
  Layers,
  Image,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState, type ElementType } from "react";
import { Resurces } from "@/app/api/shopify/[resources]/fetch/route";
import { isShopifyProject } from "@/lib/dashboard-routes";

const ResourceTypes = {
  PRODUCTS: "products",
  ORDERS: "orders",
  CUSTOMERS: "customers",
  COUPONS: "coupons",
  PAGES: "pages",
  BLOGS: "blogs",
  ARTICLES: "articles",
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
  CUSTOMERS: {
    label: "Customers",
    type: "customers",
    description: "Export customer profiles and addresses",
    icon: UsersIcon,
    accent: "bg-teal-500/10 text-teal-600",
  },
  ARTICLES: {
    label: "Articles / Blog Posts",
    type: "articles",
    description: "Get all articles across blogs",
    icon: Layers,
    accent: "bg-orange-500/10 text-orange-600",
  },
  IMAGES: {
    type: "images",
    label: "Bulk Image Export (Free up to 3,000 images)",
    description:
      "Images attached to products or pages are always included at no extra cost.",
    icon: Image,
    accent: "bg-neon-500/10 text-neon-600",
  },
  COUPONS: {
    type: "coupons",
    label: "Coupons",
    description:
      "Shopify discount codes and free-shipping coupons for WooCommerce.",
    icon: Ticket,
    accent: "bg-amber-500/10 text-amber-600",
  },
  PRODUCTS: {
    type: "products",
    label: "Products",
    description: "Export your product catalog and variants",
    icon: ShoppingCartIcon,
    accent: "bg-pink-500/10 text-pink-600",
  },
};

const RESOURCE_KEYS = Object.keys(ResourceTypes) as ResourceKey[];

export default function ShopifyToWpDashboard() {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [blogIdInputs, setBlogIdInputs] = useState<Record<string, string>>({});
  const { activeProject, shopifyData, setShopifyData } = useProjectContext();
  const router = useRouter();
  const params = useParams<{ projects?: string }>();

  const routeProject =
    typeof params.projects === "string"
      ? decodeURIComponent(params.projects)
      : activeProject;
  const selectedProject = routeProject ?? activeProject;
  const isSuitableProject = isShopifyProject(selectedProject);

  async function getResources(type: ResourceKey, post_id?: string) {
    if (!selectedProject) return;

    setLoadingMap((prev) => ({
      ...prev,
      [type]: true,
    }));

    try {
      const resourceValue = ResourceTypes[type];
      const endpoint = post_id
        ? `/api/shopify/${resourceValue}/fetch?shop=${encodeURIComponent(
            selectedProject,
          )}&blogId=${encodeURIComponent(post_id)}`
        : `/api/shopify/${resourceValue}/fetch?shop=${encodeURIComponent(
            selectedProject,
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

  if (!selectedProject) {
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
                          selectedProject,
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
