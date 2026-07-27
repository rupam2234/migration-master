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
          plug in your own store and see where you land.
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
          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Provider
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Pricing model
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Typical reported quote, ~6,000 items
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">Cart2Cart</td>
                <td className="px-4 py-3">
                  Entity-based (products, images, options) via their pricing
                  estimator
                </td>
                <td className="px-4 py-3">≈ $180&ndash;$210</td>
                <td className="px-4 py-3">
                  Add-ons like order migration or SEO URL preservation are
                  priced separately
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">LitExtension</td>
                <td className="px-4 py-3">
                  Tiered, entity-based, starting from $79 and scaling with total
                  entity count
                </td>
                <td className="px-4 py-3">≈ $199 average</td>
                <td className="px-4 py-3">
                  Optional extras (custom field mapping, manual support)
                  typically add $30&ndash;$50
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Figures based on publicly available pricing pages and commonly
          reported user quotes as of publication; always confirm current pricing
          directly with the provider before purchasing, since rates and included
          services can change.
        </p>
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

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Tier
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Item range
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Rate per item
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">Tier 1</td>
                <td className="px-4 py-3">1&ndash;500</td>
                <td className="px-4 py-3">$0.10</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">Tier 2</td>
                <td className="px-4 py-3">501&ndash;5,000</td>
                <td className="px-4 py-3">$0.035</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Tier 3</td>
                <td className="px-4 py-3">5,001+</td>
                <td className="px-4 py-3">$0.0266</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          The 15% discount code (<strong>SAVE15</strong>) is applied to the
          pre-discount total across all tiers, not just the first bracket.
        </p>
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
          the most accurate, up-to-date number for their platforms.
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
          shown alongside typical reported ranges for the entity-based providers
          at similar scale.
        </p>

        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Catalog size
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Our total, pre-discount
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Our total, after 15%
                </th>
                <th className="text-left px-4 py-3 font-semibold border-b border-gray-200">
                  Typical entity-based range
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">1,000 items</td>
                <td className="px-4 py-3">$85.00</td>
                <td className="px-4 py-3">$72.25</td>
                <td className="px-4 py-3">varies by provider &amp; add-ons</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">
                  5,200 items (mixed catalog)
                </td>
                <td className="px-4 py-3">$219.32</td>
                <td className="px-4 py-3">$186.42</td>
                <td className="px-4 py-3">≈ $210&ndash;$215 reported</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">6,000 items</td>
                <td className="px-4 py-3">$234.12</td>
                <td className="px-4 py-3">$199.00</td>
                <td className="px-4 py-3">≈ $180&ndash;$210 reported</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">10,000 items</td>
                <td className="px-4 py-3">$337.62</td>
                <td className="px-4 py-3">$287.98</td>
                <td className="px-4 py-3">varies by provider &amp; add-ons</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Entity-based ranges depend on exactly which entities and add-ons are
          included, so treat them as a general reference point rather than a
          direct line-item comparison.
        </p>
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
        <ul className="list-disc pl-6 mt-4 space-y-2">
          <li>
            <strong>If you want a guided, full-service quote</strong> that
            accounts for every entity type individually, an estimator-based
            provider like Cart2Cart or LitExtension is a solid, proven choice,
            especially if your catalog has a lot of custom fields, complex
            variants, or order history you need moved precisely.
          </li>
          <li>
            <strong>
              If you&apos;d rather calculate your own number upfront
            </strong>{" "}
            without submitting store details first, a published per-item tiered
            rate lets you do that math yourself in a couple of minutes, using
            the calculator above or your own spreadsheet.
          </li>
          <li>
            <strong>If your priority is white-glove support</strong> through the
            migration itself, check what each provider includes as standard
            versus paid add-on&mdash;this often matters more than the headline
            number.
          </li>
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
        <p className="mt-4">
          On our end, the only optional extra beyond the per-item rate is
          premium support, and it&apos;s listed separately at checkout rather
          than folded into the base total.
        </p>
      </>
    ),
  },
  {
    number: "08",
    title: "Common questions",
    body: (
      <>
        <p>
          <strong>Does the 15% discount apply to add-ons?</strong> Yes&mdash; it
          applies to the total after all selected services are added, not just
          the base per-item cost.
        </p>
        <p className="mt-4">
          <strong>What if my catalog has more than 10,000 items?</strong> The
          same tiered rates continue&mdash;everything past 5,000 items is billed
          at the Tier 3 rate of $0.0266 per item, with no separate negotiation
          required.
        </p>
        <p className="mt-4">
          <strong>
            Is this pricing model better than Cart2Cart or LitExtension&apos;s?
          </strong>{" "}
          Not inherently&mdash;it&apos;s a different trade-off. Entity-based
          pricing can account for complexity our flat per-item rate doesn&apos;t
          separately price (like image-heavy catalogs), while our model trades
          some of that granularity for a number you can calculate yourself in
          advance.
        </p>
        <p className="mt-4">
          <strong>Are there any hidden fees on our end?</strong> No. The only
          optional cost is premium support, shown separately at checkout.
        </p>
      </>
    ),
  },
  {
    number: "09",
    title: "Getting started",
    body: (
      <>
        <p>If you&apos;ve settled on our tool, here&apos;s how to begin:</p>
        <ol className="list-decimal pl-6 mt-4 space-y-1">
          <li>
            Try the free demo&mdash;we&apos;ll migrate up to 50 items at no
            charge so you can verify data integrity before running a full
            migration. (please reach us out via{" "}
            <a className="underline hover:text-[#a23b2e]" href="/contact">
              contact page
            </a>
            )
          </li>
          <li>
            Use the code <strong>SAVE15</strong> on your first full migration to
            apply the 15% discount automatically.
          </li>
          <li>
            Reach out directly if you have requirements outside the standard
            catalog structure&mdash;multiple stores, unusual custom fields, or
            anything else worth a direct conversation.
          </li>
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
