"use client";

import { useMemo, useState } from "react";
import {
  Image as ImageIcon,
  FileText,
  Layers,
  Tag,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  Package,
  Circle,
  ShoppingCart,
} from "lucide-react";
import styles from "./style.module.css";
import { Container, Footer, Header } from "@/components";

const PLATFORMS = [
  { id: "shopify", name: "Shopify" },
  { id: "wordpress", name: "WordPress" },
  { id: "wix", name: "Wix" },
];

const ROUTES = [
  { from: "shopify", to: "wordpress", live: true },
  { from: "wordpress", to: "shopify", live: true },
  { from: "wix", to: "wordpress", live: false },
];

const TIERS = [
  {
    name: "Migration",
    range: "Up to 20,000 items",
    rate: 0.2,
    minimum: 1,
    icon: Package,
    blurb: "Features:",
    features: [
      "Quick API authentication with your store",
      "Chunked WXR file for default WP import",
      "Itemized manifest before you pay",
      "Email support",
    ],
  },
];

const MANIFEST_ROWS = [
  { label: "Products", count: "312", icon: Package },
  { label: "Orders", count: "1,204", icon: ShoppingCart },
  { label: "Images", count: "4,231", icon: ImageIcon },
  { label: "Articles", count: "86", icon: FileText },
  { label: "Pages", count: "12", icon: Layers },
  { label: "Categories", count: "5", icon: Tag },
];

const STEPS = [
  {
    n: "01",
    title: "Connect your store",
    body: "Point us at your store, or upload an export. Nothing is moved yet.",
  },
  {
    n: "02",
    title: "Review the manifest",
    body: "See exactly how many images, posts, pages, and categories will move — before you pay for anything.",
  },
  {
    n: "03",
    title: "Export",
    body: "We generate import-ready files, split into chunks sized for your host so large catalogs don't time out on import.",
  },
  {
    n: "04",
    title: "Import",
    body: "Drop the files into your new platform's importer, in order. Your content arrives with categories and media already attached.",
  },
];

const WHAT_MOVES = [
  {
    icon: Package,
    title: "Products",
    body: "Titles, descriptions, prices, stock, and images, matched to WooCommerce's product fields on import.",
  },
  {
    icon: ShoppingCart,
    title: "Orders",
    body: "Order history, line items, and customer details, so past sales aren't stranded on Shopify.",
  },
  {
    icon: ImageIcon,
    title: "Media library",
    body: "Every image, with its original filename and alt text carried over so nothing in your library shows up blank.",
  },
  {
    icon: FileText,
    title: "Blog posts",
    body: "Articles keep their author, publish date, and full HTML body, linked back to the right category.",
  },
  {
    icon: Layers,
    title: "Pages",
    body: "Static pages move with their original slugs intact, so old links keep working.",
  },
  {
    icon: Tag,
    title: "Categories",
    body: "Blogs and collections become categories on the new platform, matched by slug so posts file into the right place automatically.",
  },
];

const FAQS = [
  {
    q: "How do I migrate my store's content to another platform?",
    a: "You connect your store, then fetch whichever content types you need — Products, Orders, Pages, Blogs, Articles, or Images — from separate cards on the dashboard. Review the itemized manifest for each, then export. You import the resulting files under your new platform's own import tool.",
  },
  {
    q: "Will I lose my SEO rankings when I migrate?",
    a: "Migrating content correctly is most of the battle: keeping original page and post slugs, preserving alt text on images, and mapping categories cleanly all help search engines recognize the moved content. You'll still want to set up redirects from old URLs to their new equivalents if the URL structure changes.",
  },
  {
    q: "What is a WXR file, and why does WordPress need one?",
    a: "WXR (WordPress eXtended RSS) is the XML format WordPress's built-in importer reads. Rather than copying files by hand, we package your content into WXR files so WordPress can import everything — posts, pages, media, and categories — through its normal import screen.",
  },
  {
    q: "Can I migrate just my blog and keep my store where it is?",
    a: "Yes. Many stores keep checkout on their current platform and move only the content side — blog, pages, and media library — over. You only pay for the items you actually export.",
  },
  {
    q: "How long does a migration take?",
    a: "Generating the export files is typically fast, even for large catalogs, since the work is mostly automated. The import itself depends on your new host's limits, which is why large exports are split into smaller chunked files rather than one giant one.",
  },
  {
    q: "Do you migrate products and orders too?",
    a: "Yes. Products export with titles, descriptions, prices, stock, and images; orders export with order history, line items, and customer details. Both come through as WordPress-ready WXR files, so they land alongside your pages and blog content in one import.",
  },
  {
    q: "Do I import products through WooCommerce's CSV importer?",
    a: "No — skip the WooCommerce products (CSV) option in WordPress. Use the WordPress importer under Tools → Import instead; it reads the WXR files we generate and handles pages, blogs, products, and orders in the same pass.",
  },
  {
    q: "Are more platforms coming?",
    a: "Shopify and WordPress are live in both directions today. Other routes — WooCommerce, Wix, and BigCommerce — are in progress. If you need one that isn't live yet, email support and we'll let you know when it ships.",
  },
];

const NAV_ITEMS = [
  { link: "/blog", title: "Guides" },
  { link: "#how-it-works", title: "How it works" },
  { link: "#what-moves", title: "What moves" },
  { link: "#pricing", title: "Pricing" },
  { link: "#faq", title: "FAQ" },
];

function routeIsLive(from: string, to: string) {
  return ROUTES.some((r) => r.from === from && r.to === to && r.live);
}

export default function Main() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [itemCount, setItemCount] = useState(0);
  const [fromId, setFromId] = useState("shopify");
  const [toId, setToId] = useState("wordpress");

  const isLive = routeIsLive(fromId, toId);
  const tier = TIERS[0];
  const estimate = useMemo(() => {
    const raw = itemCount * tier.rate;
    return Math.max(raw, tier.minimum);
  }, [itemCount, tier]);

  const swapPlatforms = () => {
    setFromId(toId);
    setToId(fromId);
  };

  return (
    <div className={styles["mm-root"]}>
      <Header nav items={NAV_ITEMS} />

      <Container>
        <section className={`${styles["mm-shell"]} ${styles["mm-hero"]}`}>
          <div>
            <p className={styles["mm-eyebrow"]}>Shopify migration, itemized</p>
            <h1 className={`${styles["mm-display"]} ${styles["mm-h1"]}`}>
              Move from Shopify to WordPress
              <br />
              <span className={styles["mm-accent"]}>
                Export products, orders, pages, blogs, and media.
              </span>
            </h1>
            <p className={styles["mm-sub"]}>
              We export your products, orders, blog posts, pages, categories,
              and media library, then package them into WordPress-ready WXR
              files — the same import format WordPress&apos;s own importer
              expects. No plugin to install, no missing images, no broken
              categories.
            </p>

            <div className={styles["mm-route-picker"]}>
              <select
                className={styles["mm-route-select"]}
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                aria-label="Migrate from"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles["mm-route-swap"]}
                onClick={swapPlatforms}
                aria-label="Swap platforms"
              >
                <ArrowLeftRight size={15} />
              </button>
              <select
                className={styles["mm-route-select"]}
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                aria-label="Migrate to"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {isLive ? (
                <span className={styles["mm-route-status-live"]}>
                  <CheckCircle2 size={13} /> Live
                </span>
              ) : (
                <span className={styles["mm-route-status-soon"]}>
                  <Circle size={9} /> Coming soon
                </span>
              )}
            </div>

            <div className={styles["mm-hero-ctas"]}>
              <a
                className={`${styles["mm-btn"]} ${styles["mm-btn-primary"]}`}
                href={isLive ? "#pricing" : "#faq"}
              >
                {isLive ? "Start your migration" : "Get notified when it ships"}{" "}
                <ArrowRight size={15} />
              </a>
              <a
                className={`${styles["mm-btn"]} ${styles["mm-btn-outline"]}`}
                href="#how-it-works"
              >
                See how it works
              </a>
            </div>

            <div className={styles["mm-chip-row"]}>
              <span className={styles["mm-chip"]}>
                <CheckCircle2 size={13} /> Products &amp; orders included
              </span>
              <span className={styles["mm-chip"]}>
                <CheckCircle2 size={13} /> Outputs valid WXR
              </span>
              <span className={styles["mm-chip"]}>
                <CheckCircle2 size={13} /> Images keep alt text
              </span>
            </div>
          </div>

          <div className={styles["mm-browser-wrap"]}>
            <div className={styles["mm-browser"]}>
              <div className={styles["mm-browser-chrome"]}>
                <span className={styles["mm-browser-dot"]} />
                <span className={styles["mm-browser-dot"]} />
                <span className={styles["mm-browser-dot"]} />
                <div className={styles["mm-browser-address"]}>
                  migrationmaster.online/dashboard
                </div>
              </div>
              <div className={styles["mm-browser-body"]}>
                <div className={styles["mm-browser-titlebar"]}>
                  <span>Export &nbsp;·&nbsp; No. 00417</span>
                  <span className={styles["mm-browser-status"]}>
                    Cleared for import
                  </span>
                </div>
                <div className={styles["mm-route"]}>
                  <span className={styles["mm-port"]}>Shopify</span>
                  <span
                    className={styles["mm-route-line"]}
                    aria-hidden="true"
                  />
                  <span className={styles["mm-port"]}>WordPress</span>
                </div>
                {MANIFEST_ROWS.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div className={styles["mm-row"]} key={row.label}>
                      <span className={styles["mm-row-left"]}>
                        <Icon size={16} />
                        {row.label}
                      </span>
                      <span className={styles["mm-row-count"]}>
                        {row.count} items
                        <span className={styles["mm-packed"]}>✓ packed</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className={`${styles["mm-section"]} ${styles["mm-section-alt"]}`}
        >
          <div className={styles["mm-shell"]}>
            <div className={styles["mm-kicker"]}>
              <span className={styles["mm-kicker-rule"]} />
              <span className={styles["mm-eyebrow"]}>Process</span>
            </div>
            <h2 className={`${styles["mm-display"]} ${styles["mm-h2"]}`}>
              Four steps, in order
            </h2>
            <p className={styles["mm-section-lede"]}>
              Migrating a store doesn&apos;t need to mean copying content by
              hand. Here&apos;s the route your content takes.
            </p>
            <div className={styles["mm-steps"]}>
              {STEPS.map((s) => (
                <div key={s.n}>
                  <div className={styles["mm-step-n"]}>{s.n}</div>
                  <div className={styles["mm-step-title"]}>{s.title}</div>
                  <div className={styles["mm-step-body"]}>{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="what-moves" className={styles["mm-section"]}>
          <div className={styles["mm-shell"]}>
            <div className={styles["mm-kicker"]}>
              <span className={styles["mm-kicker-rule"]} />
              <span className={styles["mm-eyebrow"]}>Scope</span>
            </div>
            <h2 className={`${styles["mm-display"]} ${styles["mm-h2"]}`}>
              What actually moves
            </h2>
            <p className={styles["mm-section-lede"]}>
              Everything below arrives as WordPress-ready WXR files — imported
              through WordPress&apos;s own importer (not a separate WooCommerce
              CSV), so products and orders land alongside your pages and blog
              content in one pass.
            </p>
            <div className={styles["mm-grid-4"]}>
              {WHAT_MOVES.map((item) => {
                const Icon = item.icon;
                return (
                  <div className={styles["mm-card"]} key={item.title}>
                    <div className={styles["mm-card-icon"]}>
                      <Icon size={18} />
                    </div>
                    <div className={styles["mm-card-title"]}>{item.title}</div>
                    <div className={styles["mm-card-body"]}>{item.body}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className={`${styles["mm-section"]} ${styles["mm-section-alt"]}`}
        >
          <div className={styles["mm-shell"]}>
            <div className={styles["mm-kicker"]}>
              <span className={styles["mm-kicker-rule"]} />
              <span className={styles["mm-eyebrow"]}>Pricing</span>
            </div>
            <h2 className={`${styles["mm-display"]} ${styles["mm-h2"]}`}>
              Priced by the item
            </h2>
            <p className={styles["mm-section-lede"]}>
              A flat fee punishes a small blog and underprices a 20,000-item
              catalog. So you pay per item exported and prepared for import —
              the rate drops as volume goes up.
            </p>

            <div className={styles["mm-tiers"]}>
              {TIERS.map((t) => {
                const Icon = t.icon;
                return (
                  <div className={styles["mm-tier"]} key={t.name}>
                    <div className={styles["mm-card-icon"]}>
                      <Icon size={18} />
                    </div>
                    <div className={styles["mm-tier-name"]}>{t.name}</div>
                    <div className={styles["mm-tier-range"]}>{t.range}</div>
                    <div className={styles["mm-tier-rate"]}>
                      <span className={styles["mm-tier-rate-num"]}>
                        ${t.rate.toFixed(2)}
                      </span>
                      <span className={styles["mm-tier-rate-unit"]}>
                        / item
                      </span>
                    </div>
                    <div className={styles["mm-tier-min"]}>
                      {t.minimum > 0
                        ? `Free import file generation until ${formatUSD(t.minimum)}`
                        : "No minimum"}
                    </div>
                    <div className={styles["mm-tier-blurb"]}>{t.blurb}</div>
                    <ul className={styles["mm-tier-features"]}>
                      {t.features.map((f) => (
                        <li key={f}>
                          <CheckCircle2 size={15} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className={styles["mm-calc"]}>
              <div>
                <div className={styles["mm-calc-label"]}>
                  Estimate your export
                </div>
                <div className={styles["mm-calc-count"]}>
                  {itemCount.toLocaleString()} items
                </div>
                <input
                  className={styles["mm-range"]}
                  type="range"
                  min={50}
                  max={20000}
                  step={50}
                  value={itemCount}
                  onChange={(e) => setItemCount(Number(e.target.value))}
                  aria-label="Number of items to export"
                />
              </div>
              <div className={styles["mm-calc-receipt"]}>
                <div className={styles["mm-receipt-row"]}>
                  <span>Tier</span>
                  <span className={styles["mm-mono"]}>{tier.name}</span>
                </div>
                <div className={styles["mm-receipt-row"]}>
                  <span>Rate</span>
                  <span className={styles["mm-mono"]}>
                    ${tier.rate.toFixed(2)} / item
                  </span>
                </div>
                <div className={styles["mm-receipt-total"]}>
                  <span>Estimated total</span>
                  <span>{formatUSD(Math.round(estimate))}</span>
                </div>
                <div className={styles["mm-receipt-tier"]}>
                  Final price confirmed after manifest review — no surprise
                  charges.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className={styles["mm-section"]}>
          <div className={styles["mm-shell"]}>
            <div className={styles["mm-kicker"]}>
              <span className={styles["mm-kicker-rule"]} />
              <span className={styles["mm-eyebrow"]}>FAQ</span>
            </div>
            <h2 className={`${styles["mm-display"]} ${styles["mm-h2"]}`}>
              Questions about moving your store
            </h2>
            <div className={styles["mm-faq"]}>
              {FAQS.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div className={styles["mm-faq-item"]} key={item.q}>
                    <button
                      className={styles["mm-faq-q"]}
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      {item.q}
                      <ChevronDown
                        size={18}
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    </button>
                    {isOpen && <p className={styles["mm-faq-a"]}>{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </Container>

      <Footer />
    </div>
  );
}

function formatUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
