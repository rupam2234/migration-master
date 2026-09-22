import { FileTextIcon, Image, Layers, NewspaperIcon, ShoppingCartIcon, Ticket, UsersIcon } from "lucide-react";
import { ElementType } from "react";

export type Tags = "Check Status" | "Connected" | "Not Connected" | "Checking...";

export type Status = {
    color: string;
};

export const ResourceTypes = {
    PRODUCTS: "products",
    ORDERS: "orders",
    CUSTOMERS: "customers",
    COUPONS: "coupons",
    PAGES: "pages",
    BLOGS: "blogs",
    ARTICLES: "articles",
    IMAGES: "images",
} as const satisfies Record<string, ShopifyResources>;

export type ResourceKey = keyof typeof ResourceTypes;

type Services = {
    label: string;
    type: ShopifyResources;
    description: string;
    icon: ElementType;
    accent: string;
};

export type WordPressService = {
    label: string;
    type: WordPressResource;
    description: string;
    icon: ElementType;
    accent: string;
};

export const RESOURCE_CONFIG: Record<ResourceKey, Services> = {
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
            "Shop discount codes and free-shipping coupons.",
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

export const RESOURCE_KEYS = Object.keys(ResourceTypes) as ResourceKey[];

/**
 * Resources whose proxy fetch needs a scope value beyond the project itself —
 * currently only Shopify articles, which are fetched per blog.
 *
 * Kept here as the single source of truth so the migration and export screens
 * agree on when a fetch needs extra context.
 */
export const SCOPED_RESOURCES: ResourceKey[] = ["ARTICLES"];

/** True when fetching this resource (key or slug) requires a scope value. */
export function requiresScope(resource: string): boolean {
    return SCOPED_RESOURCES.includes(resource.toUpperCase() as ResourceKey);
}

/**
 * sessionStorage key holding the scope (blog id) last used for a resource, so
 * the export screen can target the exact same record set the user fetched.
 */
export function scopeStorageKey(project: string, resource: string): string {
    return `shopif_scope:${project}-${resource.toUpperCase()}`;
}

export const WordPressResourceTypes = {
    posts: "posts",
    pages: "pages",
    media: "media",
    categories: "categories",
    products: "products",
    orders: "orders",
    customers: "customers",
    coupons: "coupons",
} as const satisfies Record<string, WordPressResource>;

export type ShopifyResources =
    | "single_article"
    | "articles"
    | "blogs"
    | "pages"
    | "orders"
    | "images"
    | "products"
    | "customers"
    | "coupons";

export type WordPressResource =
    | "posts"
    | "pages"
    | "media"
    | "categories"
    | "products"
    | "orders"
    | "customers"
    | "coupons";

export const MMC_RESOURCES: WordPressResource[] = ["posts", "pages", "media", "categories"];
export const WOO_RESOURCES: WordPressResource[] = ["products", "orders", "customers", "coupons"];

