import { Main } from "../index";
import { getSiteStats, type SiteStats } from "@/lib/stats";
import { getTrustpilotStats, type TrustpilotStats } from "@/lib/trustpilot";

export const metadata = {
  title: "Migration Master | Website & Store Migration Tool",
  description:
    "Prepare itemized, import-ready files for your products, customers, orders, pages, blogs, and media library. Migrate your website and store between platforms like Shopify and WordPress without broken links, missing images, or lost SEO.",
};

// ISR: refresh the server-fetched stats/trustpilot data every 10 minutes
// instead of hitting Postgres / Trustpilot on every visitor request.
export const revalidate = 600;

export default async function Home() {
  // Fetched once per revalidation window and passed down as props —
  // the badge components skip their client-side fetch when props arrive.
  const [trustpilot, stats]: [TrustpilotStats, SiteStats | null] =
    await Promise.all([getTrustpilotStats(), getSiteStats()]);

  return <Main trustpilot={trustpilot} stats={stats ?? undefined} />;
}
