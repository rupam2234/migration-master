import * as migrationPost from "./how-to-migrate-shopify-products-to-wordpress";

export const posts = {
    [migrationPost.meta.slug]: migrationPost,
    // [otherPost.meta.slug]: otherPost,
};

export type PostSlug = keyof typeof posts;