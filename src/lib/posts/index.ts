import * as how_to_migrate_shopify_products_to_wordpress from "./how-to-migrate-shopify-products-to-wordpress";

export const posts = {
    [how_to_migrate_shopify_products_to_wordpress.meta.slug]: how_to_migrate_shopify_products_to_wordpress,
    // [otherPost.meta.slug]: otherPost,
};

export type PostSlug = keyof typeof posts;