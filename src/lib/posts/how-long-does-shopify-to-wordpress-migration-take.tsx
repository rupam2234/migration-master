import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import { StepTypes } from "./type";
import Link from "next/link";

export const meta = {
  slug: "how-long-does-shopify-to-wordpress-migration-take",
  title: "How Long Does a Shopify to WordPress Migration Actually Take?",
  description:
    "The honest answer depends on what you mean by \u2018migration.\u2019 A phase-by-phase timeline breakdown\u2014what takes hours, what takes weeks, and why most of the wait has nothing to do with moving your data.",
  author: "Migration Master Editorial Team",
};

// Local visual primitives, matching the style used across the blog series.
const Callout = ({
  tone = "neutral",
  label,
  children,
}: {
  tone?: "neutral" | "accent" | "success";
  label?: string;
  children: React.ReactNode;
}) => {
  const toneStyles: Record<string, string> = {
    neutral: "border-gray-200 bg-gray-50",
    accent: "border-[#a23b2e]/20 bg-[#a23b2e]/5",
    success: "border-emerald-200 bg-emerald-50",
  };
  const labelStyles: Record<string, string> = {
    neutral: "text-gray-500",
    accent: "text-[#a23b2e]",
    success: "text-emerald-700",
  };
  return (
    <div className={`mt-6 rounded-lg border ${toneStyles[tone]} px-5 py-4`}>
      {label && (
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${labelStyles[tone]} mb-1.5`}
        >
          {label}
        </p>
      )}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
};

const CTACard = ({
  eyebrow,
  heading,
  body,
  buttonText,
  href,
}: {
  eyebrow?: string;
  heading: string;
  body: string;
  buttonText: string;
  href: string;
}) => (
  <div className="mt-8 rounded-xl border border-[#a23b2e]/20 bg-gradient-to-br from-[#a23b2e]/5 via-[#a23b2e]/[0.02] to-transparent p-6 sm:p-8">
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-wide text-[#a23b2e] mb-2">
        {eyebrow}
      </p>
    )}
    <p className="text-lg font-bold text-gray-900">{heading}</p>
    <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-xl">
      {body}
    </p>
    <Link
      href={href}
      className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#a23b2e] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#8a3226]"
    >
      {buttonText}
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    </Link>
  </div>
);

const TimelinePhase = ({
  step,
  title,
  time,
  desc,
  last = false,
}: {
  step: string;
  title: string;
  time: string;
  desc: string;
  last?: boolean;
}) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a23b2e] text-xs font-semibold text-white">
        {step}
      </div>
      {!last && <div className="w-px flex-1 bg-gray-200 mt-1" />}
    </div>
    <div className={last ? "pb-0" : "pb-8"}>
      <p className="font-semibold text-gray-900">{title}</p>
      <span className="inline-block mt-1 mb-1.5 rounded-full bg-[#a23b2e]/10 text-[#a23b2e] px-2.5 py-0.5 text-xs font-semibold">
        {time}
      </span>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const steps: StepTypes[] = [
  {
    number: "01",
    title:
      'There isn\'t one answer, because "migration" means two different things',
    body: (
      <>
        <p>
          Search for this question and you&apos;ll get wildly different answers,
          some guides say days, others say 2 to 12 weeks, a few say 3 to 6
          months. All of them can be true at once, because they&apos;re
          measuring different things.
        </p>
        <p className="mt-4">
          <strong>Moving your data</strong>, products, orders, customers, pages,
          blog posts, images, is the part an automated tool handles, and
          it&apos;s genuinely fast: independent write-ups peg the actual
          transfer at a few hours once it&apos;s running.{" "}
          <strong>Rebuilding your storefront</strong>, the theme, the checkout
          design, custom apps, is a separate project, because Shopify themes are
          written in Liquid, which has no WordPress equivalent, so the visual
          design has to be rebuilt rather than imported.
        </p>
        <p className="mt-4">
          Most of the &ldquo;weeks&rdquo; you see quoted are pricing that whole
          second project. This post separates the two, so you can tell which
          number applies to what you&apos;re actually planning to do.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "The migration time stack",
    body: (
      <>
        <p>
          A useful way to think about any migration timeline is as three layers
          stacked on top of each other: the time it takes to actually move and
          rebuild things, the time you spend deciding what to do, and the time
          spent fixing things that came up along the way. Most delays come from
          the second and third, not the first.
        </p>
        <div className="mt-6">
          <TimelinePhase
            step="1"
            title="Prep & connect"
            time="15–30 minutes"
            desc="Create your destination WordPress/WooCommerce install, then connect your Shopify store credentials to the migration tool."
          />
          <TimelinePhase
            step="2"
            title="Free demo migration"
            time="A few minutes"
            desc="Run a small sample migration (Migration Master's free demo moves up to 10 items) to check formatting, images, and structure before committing to anything."
          />
          <TimelinePhase
            step="3"
            title="Full data migration"
            time="Under an hour to a few hours"
            desc="Products, orders, customers, pages, and blog posts transfer automatically. Larger catalogs and full order history push this toward the higher end."
          />
          <TimelinePhase
            step="4"
            title="Review & redirect mapping"
            time="A few hours to a few days"
            desc="This is manual and store-specific: checking categories and menus landed correctly, and setting up 301 redirects from old Shopify URLs to their new WordPress paths."
          />
          <TimelinePhase
            step="5"
            title="DNS cutover & propagation"
            time="Usually 24–48 hours"
            desc="Pointing your domain at the new site. The switch itself is quick, but DNS changes take time to propagate globally, so both versions may be briefly reachable depending on location."
          />
          <TimelinePhase
            step="6"
            title="Post-launch stabilization"
            time="1–2 weeks of light monitoring"
            desc="Watching for broken links, confirming search engines are indexing the new URLs, and running a second delta migration if new orders came in during the move."
            last
          />
        </div>
        <Callout tone="neutral" label="Where these phase estimates come from">
          Phase 3&apos;s speed and the theme-rebuild distinction are backed by
          independent migration guides, and the DNS propagation window is
          standard technical practice, full sources at the end of this post.
        </Callout>
      </>
    ),
  },
  {
    number: "03",
    title: "The data transfer itself, by catalog size",
    body: (
      <>
        <p>
          Since the data transfer is the part an automated tool actually
          controls, it&apos;s also the part you can estimate precisely, rather
          than getting a &ldquo;depends on complexity&rdquo; shrug. It scales
          with catalog size in predictable tiers:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            {
              tier: "1–500 items",
              time: "Under 30 minutes",
              note: "typical for a small catalog",
            },
            {
              tier: "501–5,000 items",
              time: "30 minutes–2 hours",
              note: "most mid-size stores",
            },
            {
              tier: "5,001+ items",
              time: "2–6 hours",
              note: "large or image-heavy catalogs",
            },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-xl border border-gray-200 p-5 hover:border-[#a23b2e]/40 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t.tier}
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900">{t.time}</p>
              <p className="mt-1 text-sm text-gray-500">{t.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-4">
          These bands line up with the same catalog-size tiers we use for
          pricing, see our{" "}
          <Link
            href="/blog/shopify-to-wordpress-price-comparison"
            className="underline underline-offset-2 hover:text-[#a23b2e]"
          >
            tool pricing comparison
          </Link>{" "}
          if you want to estimate cost and time together. Order history,
          customer records, and variant images add to the transfer time
          somewhat, but not dramatically, they run in the same batch as
          products, not as a separate pass.
        </p>
      </>
    ),
  },
  {
    number: "04",
    title: "What actually stretches a migration to weeks or months",
    body: (
      <>
        <p>
          If the data moves in hours, why do so many guides quote 4&ndash;12
          weeks, or longer? Because most of that time isn&apos;t data transfer
          at all:
        </p>
        <ul className="mt-4 space-y-3">
          {[
            {
              t: "Theme and design rebuild",
              d: "the single biggest driver in almost every agency timeline. Your Shopify theme can't be exported, so the storefront design is rebuilt from scratch or adapted from a WordPress theme.",
            },
            {
              t: "App and plugin replacement",
              d: "auditing what each Shopify app does, then finding or configuring a WooCommerce/WordPress equivalent for each one.",
            },
            {
              t: "Custom integrations",
              d: "ERP, subscriptions, or bespoke checkout logic that has to be re-implemented rather than copied over.",
            },
            {
              t: "Internal decision & approval time",
              d: "content sign-off, stakeholder reviews, and scheduling\u2014routinely the least-visible but largest source of delay.",
            },
          ].map((item) => (
            <li key={item.t} className="flex gap-3">
              <svg
                className="mt-1 h-4 w-4 shrink-0 text-[#a23b2e]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2v20M2 12h20" />
              </svg>
              <span>
                <strong>{item.t}</strong>, {item.d}
              </span>
            </li>
          ))}
        </ul>
        <Callout tone="accent" label="The practical takeaway">
          If you&apos;re keeping a simple, similar-looking storefront and just
          need the content and store data moved over, you&apos;re mostly
          skipping the slowest layer of that stack. That&apos;s the scenario an
          automated tool like ours is built for.
        </Callout>
        <CTACard
          eyebrow="See it for yourself"
          heading="Run a free demo migration in the next 5 minutes"
          body="Connect your Shopify store and migrate up to 10 items at no cost—see exactly how your products, images, and pages come across before you commit to a full run."
          buttonText="Try the free demo"
          href="/dashboard"
        />
      </>
    ),
  },
  {
    number: "05",
    title: "A realistic example week",
    body: (
      <>
        <p>
          Here&apos;s what a straightforward migration, same general look, no
          theme rebuild, a few thousand products, tends to look like in
          practice:
        </p>
        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">When</th>
                <th className="text-left px-4 py-3 font-semibold">
                  What happens
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">Day 1, morning</td>
                <td className="px-4 py-3">
                  Set up WordPress/WooCommerce, connect Shopify store, run free
                  demo migration
                </td>
              </tr>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">Day 1, afternoon</td>
                <td className="px-4 py-3">
                  Review demo results, run full migration on a staging URL
                </td>
              </tr>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">Day 2–3</td>
                <td className="px-4 py-3">
                  Spot-check products/orders, fix menus and categories, set up
                  301 redirects
                </td>
              </tr>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">Day 4</td>
                <td className="px-4 py-3">
                  Run a delta migration to catch any orders placed since day 1,
                  then cut over DNS
                </td>
              </tr>
              <tr className="odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">Day 4–18</td>
                <td className="px-4 py-3">
                  DNS propagates, monitor for broken links and indexing, keep
                  Shopify on a read-only backup for a couple of weeks
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Larger catalogs, full order history, or any amount of custom design
          work will stretch this out, but the data-transfer step itself stays
          roughly the same length regardless.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "Three things that quietly add unplanned time",
    body: (
      <>
        <ul className="mt-2 space-y-3">
          {[
            {
              t: "DNS propagation",
              d: "typically 24–48 hours, occasionally longer depending on your registrar and TTL settings. Plan for it rather than being surprised by it.",
            },
            {
              t: "Redirect mapping",
              d: "Shopify and WordPress use different URL structures by default. Skipping 301 redirects is the single most common cause of a post-migration traffic drop.",
            },
            {
              t: "New orders during the move",
              d: "your Shopify store can keep taking orders while you migrate, but you'll want a second, smaller migration afterward to catch anything that came in during the gap.",
            },
          ].map((item) => (
            <li
              key={item.t}
              className="rounded-lg border border-gray-200 px-5 py-4"
            >
              <p className="font-medium text-gray-900">{item.t}</p>
              <p className="mt-1 text-sm text-gray-600">{item.d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          If SEO continuity is your main concern going in, we cover it in more
          depth in{" "}
          <Link
            href="/blog/will-you-lose-seo-rankings-shopify-to-wordpress"
            className="underline underline-offset-2 hover:text-[#a23b2e]"
          >
            Will You Lose SEO Rankings Migrating Shopify to WordPress?
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    number: "07",
    title: "How to keep your timeline on the fast end",
    body: (
      <>
        <ol className="mt-4 space-y-3">
          {[
            <>
              Run the free demo first so surprises show up before you commit to
              a full migration, not after.
            </>,
            <>
              Keep your existing look for launch, and treat a redesign as a
              separate project you do after you&apos;re safely moved, trying to
              do both at once is what turns a day into two months.
            </>,
            <>Build your redirect map before launch day, not during it.</>,
            <>
              Schedule the DNS cutover for a low-traffic window and budget the
              full 24&ndash;48 hours for propagation before you judge whether
              anything &ldquo;broke.&rdquo;
            </>,
          ].map((content, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a23b2e] text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{content}</span>
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    number: "08",
    title: "Common questions",
    body: (
      <>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 px-5 py-4">
            <p className="font-medium text-gray-900">
              Will my Shopify store go offline while this happens?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              No. Your Shopify store stays live and sellable throughout the data
              migration; nothing is removed from it. The only downtime risk is
              around the DNS cutover itself, which you control and can schedule.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 px-5 py-4">
            <p className="font-medium text-gray-900">
              Can I speed up the data transfer by paying more?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Not meaningfully, the transfer time is mostly a function of
              catalog size, not budget. What money buys you is the
              design/rebuild layer, which is a different kind of work entirely.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 px-5 py-4">
            <p className="font-medium text-gray-900">
              What if I want a new design too?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              That&apos;s a legitimate reason for a longer timeline, just plan
              for it as its own phase. Many stores migrate the data first on
              their existing look, then redesign once they&apos;re safely on
              WordPress.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 px-5 py-4">
            <p className="font-medium text-gray-900">
              How do I get an exact estimate for my store?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Run the free demo, it migrates up to 10 items so you can see real
              timing and formatting on your own catalog before deciding on
              anything.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    number: "09",
    title: "Bottom line",
    body: (
      <>
        <p>
          If you&apos;ve read that a Shopify to WordPress migration takes weeks
          or months, that number is almost certainly describing a full redesign
          and rebuild, not the data move. The part that actually transfers your
          products, orders, customers, pages, and posts is measured in hours,
          and you can watch it happen for yourself before committing to a full
          run.
        </p>
        <CTACard
          eyebrow="Start today"
          heading="Connect your store and see your real timeline"
          body="No commitment to start—run the free demo, review the results, and decide from there. If you'd rather see every step first, the full walkthrough covers the whole process screenshot by screenshot."
          buttonText="Connect your Shopify store"
          href="/dashboard"
        />
        <p className="mt-4 text-sm text-gray-500">
          Prefer to read through it first?{" "}
          <Link
            href="/blog/how-to-migrate-shopify-products-to-wordpress"
            className="underline underline-offset-2 hover:text-[#a23b2e]"
          >
            Follow the full walkthrough
          </Link>
          .
        </p>
      </>
    ),
  },
];

export default function HowLongDoesShopifyToWordpressMigrationTake() {
  return (
    <BlogArticle>
      <BlogHeader
        title={meta.title}
        description={meta.description}
        author={meta.author}
      />
      <div className="space-y-16">
        {steps.map((step) => (
          <BlogStep key={step.number} {...step} />
        ))}
      </div>
    </BlogArticle>
  );
}
