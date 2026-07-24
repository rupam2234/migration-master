import * as how_to_migrate_shopify_products_to_wordpress from "./how-to-migrate-shopify-products-to-wordpress";
import * as  how_to_connect_shopify_to_migration_master from "./how-to-connect-shopify-to-migration-master"
import * as how_to_migrate_shopify_store_content_to_wordpress from "./how-to-migrate-shopify-store-content-to-wordpress"
import * as will_you_lose_seo_rankings_shopify_to_wordpress from "./will-you-lose-seo-rankings-shopify-to-wordpress"
import * as shopify_vs_wordpress_real_cost_comparison from "./shopify-vs-wordpress-real-cost-comparison"

export const posts = {
    [how_to_migrate_shopify_products_to_wordpress.meta.slug]: how_to_migrate_shopify_products_to_wordpress,
    [how_to_connect_shopify_to_migration_master.meta.slug]: how_to_connect_shopify_to_migration_master,
    [how_to_migrate_shopify_store_content_to_wordpress.meta.slug]: how_to_migrate_shopify_store_content_to_wordpress,
    [will_you_lose_seo_rankings_shopify_to_wordpress.meta.slug]: will_you_lose_seo_rankings_shopify_to_wordpress,
    [shopify_vs_wordpress_real_cost_comparison.meta.slug]: shopify_vs_wordpress_real_cost_comparison
};

export type PostSlug = keyof typeof posts;
export type { StepTypes } from "./type"