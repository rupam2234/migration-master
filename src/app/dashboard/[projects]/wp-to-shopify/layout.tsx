import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WordPress to Shopify",
};

export default function WpToShopifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
