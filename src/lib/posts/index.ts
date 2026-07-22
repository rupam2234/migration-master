import * as how_to_migrate_shopify_products_to_wordpress from "./how-to-migrate-shopify-products-to-wordpress";
import * as  how_to_connect_shopify_to_migration_master from "./how-to-connect-shopify-to-migration-master"

export const posts = {
    [how_to_migrate_shopify_products_to_wordpress.meta.slug]: how_to_migrate_shopify_products_to_wordpress,
    [how_to_connect_shopify_to_migration_master.meta.slug]: how_to_connect_shopify_to_migration_master
};

export type PostSlug = keyof typeof posts;
export type { StepTypes } from "./type"