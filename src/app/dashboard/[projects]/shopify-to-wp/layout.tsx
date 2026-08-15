import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopify to WordPress",
};

export default function ShopifyToWpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
