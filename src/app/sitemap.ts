import type { MetadataRoute } from "next";

import { posts } from "@/lib/posts";
import { SITE_URL } from "@/lib/site";

const staticPages: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${SITE_URL}/blog`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/contact`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/privacy-policy`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/terms-of-service`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/refund-policy`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

const blogPages: MetadataRoute.Sitemap = Object.values(posts).map((post) => ({
  url: `${SITE_URL}/blog/${post.meta.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly",
  priority: 0.7,
}));

export default function sitemap(): MetadataRoute.Sitemap {
  return [...staticPages, ...blogPages];
}
