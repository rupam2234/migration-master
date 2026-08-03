import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import { StepTypes } from "./type";
import Link from "next/link";
import PricingCalculator from "../pricing/blogCalculator";

export const meta = {
  slug: "shopify-to-wordpress-price-comparison",
  title: "Shopify to WordPress Migration: Comparing Tool Pricing",
  description:
    "A transparent, long-form look at migration pricing&mdash;how established providers like Cart2Cart and LitExtension structure their quotes, how our per-item model works, and how to calculate your own number before you commit to anything.",
  author: "Migration Master Editorial Team",
};

// Small reusable visual primitives, kept local to this post so it stays a
// self-contained drop-in file.
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

const SourceLink = ({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer nofollow"
    className="group flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-[#a23b2e]/40 hover:bg-[#a23b2e]/5"
  >
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-[#a23b2e]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
    <span>
      <span className="block text-sm font-medium text-gray-900 group-hover:text-[#a23b2e]">
        {title}
      </span>
      <span className="block text-xs text-gray-500 mt-0.5">{detail}</span>
    </span>
  </a>
);

const steps: StepTypes[] = [
  {
    number: "01",
    title: "Why migration pricing is confusing, even when providers are good",
    body: (
      <>
        <p>
          If you&apos;re moving a Shopify store to WordPress, the pricing
          landscape looks more complicated than it needs to be&mdash;not because
          any single provider is doing anything wrong, but because the major
          players each price migrations differently. Some quote by entity, some
          by tier, some only after you run their estimator.
        </p>
        <p className="mt-4">
          Cart2Cart and LitExtension are both established, widely-used migration
          services with solid track records, and plenty of stores have moved
          successfully through either one. This post isn&apos;t about which is
          &ldquo;better&rdquo;&mdash;it&apos;s about understanding how each
          pricing structure works, so that whichever route you take, you know
          what you&apos;re actually paying for before you commit.
        </p>
        <p className="mt-4">
          We&apos;ll walk through how entity-based pricing works, how our own
          per-item tiered model works, run the numbers side by side at a few
          catalog sizes, and give you a live calculator at the end so you can
          plug in your own store and see where you land. Every provider figure
          we quote is linked back to its source at the bottom of the post.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "How entity-based pricing works",
    body: (
      <>
        <p>
          Most established migration tools, including Cart2Cart and
          LitExtension, price by counting &ldquo;entities&rdquo;&mdash;
          products, images, product options, customer records, orders, and so
          on&mdash;and running that count through an estimator to produce a
          quote. It&apos;s a reasonable model: it scales with the actual
          complexity of what&apos;s being moved, not just a flat headcount of
          products.
        </p>
        <p className="mt-4">
          The trade-off is that you generally need to submit your store details
          to their calculator to get an exact number, since the rate isn&apos;t
          always a single published figure you can compute by hand. That&apos;s
          a perfectly normal way to price a service like this&mdash;it just
          means the number you see on a homepage is a starting point, not the
          final total.
        </p>

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Provider</th>
                <th className="text-left px-4 py-3 font-semibold">
                  Pricing model
                </th>
                <th className="text-left px-4 py-3 font-semibold">
                  Published starting price
                </th>
                <th className="text-left px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">Cart2Cart</td>
                <td className="px-4 py-3">
                  Entity-based (products, images, options) via their pricing
                  estimator
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-[#a23b2e]/10 text-[#a23b2e] px-2.5 py-0.5 text-xs font-semibold">
                    from $29
                  </span>
                </td>
                <td className="px-4 py-3">
                  Add-ons like order migration or SEO URL preservation are
                  priced separately
                </td>
              </tr>
              <tr className="odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">LitExtension</td>
                <td className="px-4 py-3">
                  Tiered, entity-based, scaling with total entity count
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-[#a23b2e]/10 text-[#a23b2e] px-2.5 py-0.5 text-xs font-semibold">
                    from $59
                  </span>
                </td>
                <td className="px-4 py-3">
                  Optional extras (custom field mapping, manual support)
                  typically add to the base quote
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="neutral" label="Where these numbers come from">
          Starting prices are the figures each provider publishes on their own
          pricing pages as of this writing&mdash;
          <a
            href="https://cart2cart.net/shopping-cart-migration-options/shopify-to-woocommerce-migration/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline decoration-dotted underline-offset-2 hover:text-[#a23b2e]"
          >
            Cart2Cart&apos;s Shopify&rarr;WooCommerce page
          </a>{" "}
          and{" "}
          <a
            href="https://litextension.com/pricing.html"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline decoration-dotted underline-offset-2 hover:text-[#a23b2e]"
          >
            LitExtension&apos;s pricing page
          </a>
          . Your actual quote depends on entity count and add-ons, so treat
          these as floors, not typical totals. Full source list at the end of
          this post.
        </Callout>
      </>
    ),
  },
  {
    number: "03",
    title: "How our per-item tiered pricing works",
    body: (
      <>
        <p>
          We use a different structure: a flat, published rate per item, scaled
          across three tiers, with a 15% discount code applied to the total. The
          idea isn&apos;t that this is inherently superior to entity-based
          pricing&mdash;it&apos;s a different trade-off. You give up some of the
          granularity of entity-based counting (images and options aren&apos;t
          priced separately from products) in exchange for being able to
          calculate your exact cost yourself, in advance, without submitting
          anything.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            {
              tier: "Tier 1",
              range: "1–500 items",
              rate: "$0.15",
              note: "per item",
            },
            {
              tier: "Tier 2",
              range: "501–5,000 items",
              rate: "$0.05",
              note: "per item",
            },
            {
              tier: "Tier 3",
              range: "5,001+ items",
              rate: "$0.025",
              note: "per item",
            },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-xl border border-gray-200 p-5 hover:border-[#a23b2e]/40 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t.tier}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {t.rate}
                <span className="text-sm font-medium text-gray-400 ml-1">
                  {t.note}
                </span>
              </p>
              <p className="mt-1 text-sm text-gray-500">{t.range}</p>
            </div>
          ))}
        </div>

        <Callout tone="accent" label="Discount code">
          Use <strong>SAVE15</strong> to take 15% off the pre-discount total
          across all three tiers&mdash;not just the first bracket.
        </Callout>
      </>
    ),
  },
  {
    number: "04",
    title: "Try it yourself: live cost calculator",
    body: (
      <>
        <p>
          Rather than walking through the arithmetic in prose, here&apos;s a
          live calculator using the exact tier rates above. Enter your catalog
          size and it&apos;ll show both the pre-discount and discounted totals
          in real time.
        </p>
        <PricingCalculator />
        <p className="mt-2">
          This reflects our own pricing structure only. For an exact quote from
          Cart2Cart or LitExtension, their respective estimators will give you
          the most accurate, up-to-date number for their platforms&mdash;
          <a
            href="https://cart2cart.net/shopping-cart-migration-options/shopify-to-woocommerce-migration/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:text-[#a23b2e]"
          >
            Cart2Cart&apos;s estimator
          </a>{" "}
          and{" "}
          <a
            href="https://litextension.com/pricing.html"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:text-[#a23b2e]"
          >
            LitExtension&apos;s calculator
          </a>{" "}
          are both linked here for convenience.
        </p>
      </>
    ),
  },
  {
    number: "05",
    title: "The numbers side by side, at a few common catalog sizes",
    body: (
      <>
        <p>
          To make the comparison concrete, here&apos;s how the math plays out at
          four catalog sizes. These are worked examples of our own tiered model,
          shown alongside independently reported ranges for automated migration
          tools at similar scale.
        </p>

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">
                  Catalog size
                </th>
                <th className="text-left px-4 py-3 font-semibold">
                  Our total, pre-discount
                </th>
                <th className="text-left px-4 py-3 font-semibold">
                  Our total, after 15%
                </th>
                <th className="text-left px-4 py-3 font-semibold">
                  Reported tool-based range
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">1,000 items</td>
                <td className="px-4 py-3">$100.00</td>
                <td className="px-4 py-3 font-semibold text-[#a23b2e]">
                  $85.00
                </td>
                <td className="px-4 py-3 text-gray-500">
                  varies by provider &amp; add-ons
                </td>
              </tr>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  5,200 items (mixed catalog)
                </td>
                <td className="px-4 py-3">$305.00</td>
                <td className="px-4 py-3 font-semibold text-[#a23b2e]">
                  $259.25
                </td>
                <td className="px-4 py-3 text-gray-500">
                  ≈ $100&ndash;$400 reported
                </td>
              </tr>
              <tr className="border-b border-gray-100 odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">6,000 items</td>
                <td className="px-4 py-3">$325.00</td>
                <td className="px-4 py-3 font-semibold text-[#a23b2e]">
                  $276.25
                </td>
                <td className="px-4 py-3 text-gray-500">
                  ≈ $100&ndash;$400 reported
                </td>
              </tr>
              <tr className="odd:bg-white even:bg-gray-50">
                <td className="px-4 py-3 font-medium">10,000 items</td>
                <td className="px-4 py-3">$425.00</td>
                <td className="px-4 py-3 font-semibold text-[#a23b2e]">
                  $361.25
                </td>
                <td className="px-4 py-3 text-gray-500">
                  varies by provider &amp; add-ons
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout tone="neutral" label="About the comparison range">
          The $100&ndash;$400 figure is a commonly cited range for automated
          Shopify&rarr;WooCommerce migration tools (Cart2Cart and LitExtension
          among them) at a few hundred to a few thousand entities, per
          independent cost breakdowns rather than either vendor&apos;s own
          marketing copy. Exact quotes depend on which entities and add-ons are
          included, so treat it as a reference point, not a line-item
          comparison. Sources linked below.
        </Callout>
      </>
    ),
  },
  {
    number: "06",
    title: "Which pricing model fits your situation",
    body: (
      <>
        <p>
          Neither pricing structure is objectively right&mdash;they suit
          different priorities:
        </p>
        <ul className="mt-4 space-y-3">
          {[
            {
              t: "If you want a guided, full-service quote",
              d: "that accounts for every entity type individually, an estimator-based provider like Cart2Cart or LitExtension is a solid, proven choice, especially if your catalog has a lot of custom fields, complex variants, or order history you need moved precisely.",
            },
            {
              t: "If you'd rather calculate your own number upfront",
              d: "without submitting store details first, a published per-item tiered rate lets you do that math yourself in a couple of minutes, using the calculator above or your own spreadsheet.",
            },
            {
              t: "If your priority is white-glove support",
              d: "through the migration itself, check what each provider includes as standard versus paid add-on\u2014this often matters more than the headline number.",
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
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>
                <strong>{item.t}</strong> {item.d}
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    number: "07",
    title: "What's included versus what's an add-on",
    body: (
      <>
        <p>
          Whichever provider you choose, the number that matters is the total
          after add-ons, not the headline figure. It&apos;s worth checking each
          of these explicitly before you buy, regardless of which tool you use:
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>Order and customer history migration</li>
          <li>SEO URL structure and redirect preservation</li>
          <li>Custom field and metadata mapping</li>
          <li>Image migration, including variant images</li>
          <li>Manual support or white-glove assistance during the move</li>
        </ul>
        <Callout tone="success" label="Our policy">
          The only optional extra beyond the per-item rate is premium support,
          and it&apos;s listed separately at checkout rather than folded into
          the base total.
        </Callout>
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
              Does the 15% discount apply to add-ons?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Yes&mdash;it applies to the total after all selected services are
              added, not just the base per-item cost.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 px-5 py-4">
            <p className="font-medium text-gray-900">
              What if my catalog has more than 10,000 items?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              The same tiered rates continue&mdash;everything past 5,000 items
              is billed at the Tier 3 rate of $0.025 per item, with no separate
              negotiation required.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 px-5 py-4">
            <p className="font-medium text-gray-900">
              Is this pricing model better than Cart2Cart or
              LitExtension&apos;s?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Not inherently&mdash;it&apos;s a different trade-off. Entity-based
              pricing can account for complexity our flat per-item rate
              doesn&apos;t separately price (like image-heavy catalogs), while
              our model trades some of that granularity for a number you can
              calculate yourself in advance.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 px-5 py-4">
            <p className="font-medium text-gray-900">
              Are there any hidden fees on our end?
            </p>
            <p className="mt-1 text-sm text-gray-600">
              No. The only optional cost is premium support, shown separately at
              checkout.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    number: "09",
    title: "Getting started",
    body: (
      <>
        <p>If you&apos;ve settled on our tool, here&apos;s how to begin:</p>
        <ol className="mt-4 space-y-3">
          {[
            <>
              Try the free demo&mdash;we&apos;ll migrate up to 50 items at no
              charge so you can verify data integrity before running a full
              migration. (please reach us out via{" "}
              <a className="underline hover:text-[#a23b2e]" href="/contact">
                contact page
              </a>
              )
            </>,
            <>
              Use the code <strong>SAVE15</strong> on your first full migration
              to apply the 15% discount automatically.
            </>,
            <>
              Reach out directly if you have requirements outside the standard
              catalog structure&mdash;multiple stores, unusual custom fields, or
              anything else worth a direct conversation.
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
    number: "10",
    title: "Bottom line",
    body: (
      <>
        <p>
          Cart2Cart and LitExtension are both dependable, well-established
          options, and their entity-based pricing is a reasonable way to quote a
          migration with a lot of moving parts. Our per-item tiered model is
          simply a different approach, built around letting you calculate the
          exact cost yourself before you start, and it lands in a comparable
          range at every catalog size we checked.
        </p>
        <p className="mt-4">
          Run your own numbers in the calculator above, and when you&apos;re
          ready,{" "}
          <Link
            href="/blog/how-to-migrate-shopify-products-to-wordpress"
            className="underline underline-offset-2 hover:text-orange-700"
          >
            start your migration here
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    number: "11",
    title: "References & sources",
    body: (
      <>
        <p>
          Every third-party pricing figure in this post links back to the page
          it came from. Providers update pricing without much notice, so always
          confirm current numbers directly before you buy.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <SourceLink
            href="https://cart2cart.net/shopping-cart-migration-options/shopify-to-woocommerce-migration/"
            title="Cart2Cart — Shopify to WooCommerce Migration"
            detail="Official product page; starting price and entity list"
          />
          <SourceLink
            href="https://www.shopping-cart-migration.com/migration-pricing"
            title="Cart2Cart — Migration Pricing"
            detail="Official pricing/estimator landing page"
          />
          <SourceLink
            href="https://litextension.com/pricing.html"
            title="LitExtension — Pricing"
            detail="Official pricing page; starting price and calculator"
          />
          <SourceLink
            href="https://litextension.com/shopify-migration/woocommerce-to-shopify-migration.html"
            title="LitExtension — Migration options & entities"
            detail="Official product page covering transferable data and add-ons"
          />
          <SourceLink
            href="https://www.codeable.io/blog/shopify-to-wordpress/"
            title="Codeable — From Shopify to WordPress: cost breakdown"
            detail="Independent guide citing typical automated-tool cost ranges"
          />
          <SourceLink
            href="https://storeshift.io/blog/shopify-to-woocommerce-migration-cost/"
            title="StoreShift — Shopify to WooCommerce Migration Cost (2026)"
            detail="Independent cost comparison across migration tool types"
          />
        </div>
      </>
    ),
  },
];

export default function ShopifyToWordpressPriceComparison() {
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
