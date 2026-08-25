"use client";

import { useProjectContext } from "@/context";
import {
  MMC_RESOURCES,
  Status,
  Tags,
  WOO_RESOURCES,
  WordPressResource,
  WordPressService,
} from "@/lib/sharedResources";
import { isShopifyProject } from "@/lib/dashboard-routes";
import {
  ArrowRightIcon,
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
import { useRouter } from "next/navigation";
import { ElementType, useEffect, useState } from "react";
import { cachedData, cleanExpiredCache } from "@/lib/cache";

const wpConnection: Record<Tags, Status> = {
  "Check Status": {
    color: "text-primary/60",
  },
  Connected: {
    color: "text-green-400",
  },
  "Not Connected": {
    color: "text-red-400",
  },
  "Checking...": {
    color: "text-primary/60",
  },
};

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

export default function WpToShopifyDashboard() {
  const { activeProject, wordPressData, setWordPressData } =
    useProjectContext();
  const isSuitableProject = !isShopifyProject(activeProject);
  const [wpConnected, setWpConnection] =
    useState<keyof typeof wpConnection>("Check Status");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    cleanExpiredCache({ prefix: "wp-cache:", session_Storage: true });
  }, []);

  useEffect(() => {
    if (loading || !activeProject || !isSuitableProject) return;
    setWpConnection("Checking...");
    setLoading(true);

    const checkConnection = async () => {
      const res = await fetch("/api/wordpress/wordpress-connector/status", {
        headers: {
          "x-site": activeProject,
          "Content-Type": "Application/json",
        },
      });

      if (!res.ok) {
        const errorData: any = await res.json();
        console.log(errorData.message);
        setLoading(false);
      }

      const data: any = await res.json();

      setWpConnection(
        data.source_status === true ? "Connected" : "Not Connected",
      );

      setLoading(false);
    };

    checkConnection();
  }, [activeProject]);

  async function checkConnection() {
    if (loading || !activeProject) return;

    setLoading(true);
    setWpConnection("Checking...");

    const delayedReq = setTimeout(async () => {
      const res = await fetch("/api/wordpress/wordpress-connector/status", {
        headers: {
          "x-site": activeProject,
          "Content-Type": "Application/json",
        },
      });

      if (!res.ok) {
        const errorData: any = await res.json();
        console.log(errorData.message);
        setLoading(false);
      }

      const data: any = await res.json();

      setWpConnection(
        data.source_status === true ? "Connected" : "Not Connected",
      );

      setLoading(false);
    }, 1000);

    return () => clearTimeout(delayedReq);
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
          WordPress to Shopify exports are only available for connected
          WordPress sites.
        </p>
      </div>
    );
  }

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

      return false;
    } catch (error) {
      console.error("Error fetching data", error);
      return false;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Export WordPress Contents
          </h2>

          <p className="mt-1 text-sm text-primary/50">
            Fetch data for each resource type and prepare individual Shopify
            import ready files.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary/60">
          <span>WordPress Connection: </span>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {wpConnected === "Connected" && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${wpConnection[wpConnected].color} opacity-60`}
              />
            )}
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${wpConnection[wpConnected].color}`}
            />
          </span>

          <span
            className={`font-medium tracking-tight ${wpConnection[wpConnected].color}`}
          >
            {wpConnected}
          </span>

          <span className="h-3 w-px bg-primary/10" />

          <Loader2Icon
            className={`${loading ? "animate-spin text-primary/60" : "text-primary/30"} hover:text-primary/70 rounded-md p-0.5 cursor-pointer transition-colors duration-200`}
            size={18}
            onClick={checkConnection}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...MMC_RESOURCES, ...WOO_RESOURCES].map((assetType) => {
          const type = assetType.toLocaleLowerCase() as WordPressResource;

          const {
            label,
            description,
            icon: Icon,
            accent,
          } = WORDPRESS_RESOURCE_CONFIG[type];

          return (
            <ResourceCard
              key={assetType}
              accent={accent}
              icon={Icon}
              activeProject={activeProject}
              type={assetType}
              label={label}
              description={description}
              count={(wordPressData[assetType] as any[]).length}
              fetchResourceTrigger={async () => await fetchResource(assetType)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ResourceCard({
  accent,
  icon: Icon,
  activeProject,
  type,
  description,
  label,
  count,
  fetchResourceTrigger,
}: {
  accent: string;
  icon: ElementType;
  activeProject: string;
  type: WordPressResource;
  description: string;
  label: string;
  count: number;
  fetchResourceTrigger: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [assetLoading, setAssetLoading] = useState(false);

  return (
    <div className="group relative flex flex-col gap-4 rounded-xl border border-primary/10 bg-background p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon size={20} />
        </div>

        {assetLoading && (
          <Loader2Icon size={16} className="animate-spin text-primary/40" />
        )}

        {!assetLoading && count > 0 && (
          <span
            className="cursor-pointer text-xs font-semibold text-blue-500 hover:underline"
            onClick={() =>
              router.push(
                `/dashboard/${encodeURIComponent(activeProject)}/export/${
                  WORDPRESS_RESOURCE_CONFIG[type].type
                }`,
              )
            }
          >
            Export
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{label}</h3>
        <p className="text-xs leading-relaxed text-primary/50">{description}</p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-xs font-medium text-primary/70">
          {count} item{count === 1 ? "" : "s"} loaded
        </span>

        <button
          type="button"
          onClick={async () => {
            setAssetLoading(true);
            const bool = await fetchResourceTrigger();

            if (!bool) {
              setAssetLoading(false);
            }
          }}
          disabled={assetLoading}
          className="inline-flex items-center gap-1 rounded-md border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {assetLoading ? (
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
}
