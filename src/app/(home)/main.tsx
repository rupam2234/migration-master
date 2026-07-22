"use client";

import { useMemo, useState } from "react";
import {
  Image as ImageIcon,
  FileText,
  Layers,
  Tag,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Package,
} from "lucide-react";
import styles from "./style.module.css";
import { Container, Footer, Header } from "@/components";

const TIERS = [
  {
    name: "Migration",
    range: "Up to 20,000 items",
    rate: 0.2,
    minimum: 1,
    icon: Package,
    blurb: "Features:",
    features: [
      "Quick API authentication with shopify store",
      "Chunked WXR file for default WP import",
      "Itemized manifest before you pay",
      "Email support",
    ],
  },
];

const MANIFEST_ROWS = [
  { label: "Images", count: "4,231", icon: ImageIcon },
  { label: "Articles", count: "86", icon: FileText },
  { label: "Pages", count: "12", icon: Layers },
  { label: "Categories", count: "5", icon: Tag },
];

const STEPS = [
  {
    n: "01",
    title: "Connect your store",
    body: "Point us at your Shopify store, or upload an export. Nothing is moved yet.",
  },
  {
    n: "02",
    title: "Review the manifest",
    body: "See exactly how many images, posts, pages, and categories will move — before you pay for anything.",
  },
  {
    n: "03",
    title: "Export",
    body: "We generate WordPress-ready WXR files, split into chunks sized for your host so large catalogs don't time out on import.",
  },
  {
    n: "04",
    title: "Import",
    body: "Drop the files into WordPress under Tools → Import, in order. Your content arrives with categories and media already attached.",
  },
];

const WHAT_MOVES = [
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
    body: "Shopify blogs become WordPress categories, matched by slug so posts file into the right place automatically.",
  },
];

const FAQS = [
  {
    q: "How do I migrate my Shopify store's content to WordPress?",
    a: "You connect your store (or upload a Shopify export), review an itemized manifest of what will move, then download WordPress-ready WXR files. You import those files under Tools → Import → WordPress on your WordPress site, in the order we provide them.",
  },
  {
    q: "Will I lose my SEO rankings when I move from Shopify to WordPress?",
    a: "Migrating content correctly is most of the battle: keeping original page and post slugs, preserving alt text on images, and mapping categories cleanly all help search engines recognize the moved content. You'll still want to set up redirects from old Shopify URLs to their new WordPress equivalents if the URL structure changes.",
  },
  {
    q: "What is a WXR file, and why does WordPress need one?",
    a: "WXR (WordPress eXtended RSS) is the XML format WordPress's built-in importer reads. Rather than copying files by hand, we package your Shopify content into WXR files so WordPress can import everything — posts, pages, media, and categories — through its normal import screen.",
  },
  {
    q: "Can I migrate just my blog and keep my store on Shopify?",
    a: "Yes. Many stores keep checkout on Shopify and move only the content side — blog, pages, and media library — over to WordPress. You only pay for the items you actually export.",
  },
  {
    q: "How long does a migration take?",
    a: "Generating the export files is typically fast, even for large catalogs, since the work is mostly automated. The import itself depends on your WordPress host's limits, which is why large exports are split into smaller chunked files rather than one giant one.",
  },
  {
    q: "Do you migrate products and orders too?",
    a: "Right now we focus on content: images, blog posts, pages, and categories. We don't currently move product, inventory, or order data — if your move is content-only, that's exactly what this is built for.",
  },
];

const NAV_ITEMS = [
  { link: "#how-it-works", title: "How it works" },
  { link: "#what-moves", title: "What moves" },
  { link: "#pricing", title: "Pricing" },
  { link: "#faq", title: "FAQ" },
];

export default function Main() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [itemCount, setItemCount] = useState(0);

  const tier = useMemo(() => rateForCount(), []);
  const estimate = useMemo(() => {
    const raw = itemCount * tier?.rate;
    return Math.max(raw, tier?.minimum);
  }, [itemCount, tier]);

  return (
    <div className={`${styles["mm-root"]}`}>
      <Header nav items={NAV_ITEMS} />

      <Container>
        <section className={`${styles["mm-shell"]} ${styles["mm-hero"]}`}>
          <div>
            <p className={styles["mm-eyebrow"]}>
              Shopify → WordPress, itemized
            </p>
            <h1 className={`${styles["mm-display"]} ${styles["mm-h1"]}`}>
              Shopify to WordPress migration,
              <br />
              <span className={styles["mm-accent"]}>counted item by item.</span>
            </h1>
            <p className={styles["mm-sub"]}>
              We export your Shopify blog posts, pages, categories, and media
              library, then package them into WordPress-ready WXR files — the
              same import format WordPress&apos;s own importer expects. No
              plugin to install, no missing images, no broken categories.
            </p>
            <div className={styles["mm-hero-ctas"]}>
              <a
                className={`${styles["mm-btn"]} ${styles["mm-btn-primary"]}`}
                href="#pricing"
              >
                Start your migration <ArrowRight size={15} />
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
                <CheckCircle2 size={13} /> Outputs valid WXR
              </span>
              <span className={styles["mm-chip"]}>
                <CheckCircle2 size={13} /> Images keep alt text
              </span>
              <span className={styles["mm-chip"]}>
                <CheckCircle2 size={13} /> Chunked for big stores
              </span>
            </div>
          </div>

          <div className={styles["mm-manifest-wrap"]}>
            <div className={styles["mm-manifest"]}>
              <div className={styles["mm-manifest-head"]}>
                <span className={styles["mm-manifest-title"]}>
                  Export Manifest
                </span>
                <span className={styles["mm-manifest-id"]}>No. 00417</span>
              </div>
              <div className={styles["mm-route"]}>
                <span className={styles["mm-port"]}>Shopify port</span>
                <span className={styles["mm-route-line"]} aria-hidden="true" />
                <span className={styles["mm-port"]}>WordPress port</span>
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
              <div className={styles["mm-stamp"]} aria-hidden="true">
                Cleared for import
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
              Migrating a store from Shopify to WordPress doesn&apos;t need to
              mean copying content by hand. Here&apos;s the route your content
              takes.
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
              This migration is built for content, not inventory. If you&apos;re
              moving your blog, pages, and media library off Shopify — and
              keeping checkout elsewhere, or rebuilding it separately on
              WordPress — this is exactly what it&apos;s built for.
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
              {TIERS?.map((t) => {
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
                        ${t?.rate?.toFixed(2)}
                      </span>
                      <span className={styles["mm-tier-rate-unit"]}>
                        / item
                      </span>
                    </div>
                    <div className={styles["mm-tier-min"]}>
                      {t.minimum > 0
                        ? `Free WordPress import file generation until ${formatUSD(t.minimum)}`
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
                  <span className={styles["mm-mono"]}>{tier?.name}</span>
                </div>
                <div className={styles["mm-receipt-row"]}>
                  <span>Rate</span>
                  <span className={styles["mm-mono"]}>
                    ${tier?.rate.toFixed(2)} / item
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
              Questions about moving from Shopify to WordPress
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

function rateForCount() {
  return TIERS[0];
}

function formatUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
