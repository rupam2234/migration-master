import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import { StepTypes } from "./type";
import Link from "next/link";

const IMG_DIR = "/images/blog/posts/shopify-vs-wordpress-real-cost-comparison";

export const meta = {
  slug: "shopify-vs-wordpress-real-cost-comparison",
  title: "Shopify vs WordPress: The Real Cost Comparison for 2026",
  description:
    "What Shopify and WordPress actually cost once you add apps, transaction fees, plugins, and hosting — and how to tell which one is cheaper for your specific store.",
  author: "Migration Master Editorial Team",
};

const steps: StepTypes[] = [
  {
    number: "01",
    title: "The sticker price is the wrong number to compare",
    body: (
      <>
        <p>
          Shopify&apos;s $39/month plan and a $10/month WordPress host look like
          an easy decision on paper. They&apos;re not comparable numbers.
          Shopify&apos;s plan price is the floor, not the ceiling&mdash;apps,
          transaction fees, and theme costs stack on top of it every month.
          WordPress&apos;s low number is the floor too, but what stacks on top
          is mostly one-time or optional, not recurring by default.
        </p>
        <p className="mt-4">
          The real comparison isn&apos;t plan vs. plan. It&apos;s total cost of
          ownership over 12&ndash;24 months, once you account for how each
          platform actually gets used by a real store.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "What Shopify actually costs once you're running a real store",
    image: `${IMG_DIR}/02-shopify-cost-stack.svg`,
    alt: "Diagram showing Shopify's cost stack: base plan, apps, transaction fees, and theme costs layered on top of each other",
    body: (
      <>
        <p>Here&apos;s where the number moves after month one:</p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            <strong>Transaction fees</strong> on top of your payment
            processor&apos;s cut, unless you use Shopify Payments exclusively
            &mdash;this alone can run 0.5&ndash;2% of every sale.
          </li>
          <li>
            <strong>Apps</strong> for things that are core functionality
            elsewhere: reviews, SEO, upsells, email capture, subscriptions.
            Three or four paid apps at $10&ndash;$50/month each is typical for a
            store past the hobby stage.
          </li>
          <li>
            <strong>Premium themes</strong>, usually a one-time $150&ndash;$350
            cost, but often followed by paid theme customization since Liquid
            edits aren&apos;t beginner-friendly.
          </li>
          <li>
            <strong>Plan upgrades</strong> as you hit feature walls&mdash;
            custom reports, lower transaction fees, and staff accounts all live
            behind higher tiers.
          </li>
        </ul>
        <p className="mt-4">
          A store doing meaningful volume commonly lands at{" "}
          $150&ndash;$400/month all-in, well past the advertised plan price.
        </p>
      </>
    ),
  },
  {
    number: "03",
    title: "What WordPress actually costs once you add what Shopify includes",
    body: (
      <>
        <p>
          WordPress&apos;s low floor is real, but it&apos;s not free of
          trade-offs either. To match what Shopify gives you out of the box,
          you&apos;re typically adding:
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            <strong>WooCommerce</strong> (free) plus a payment gateway plugin
            &mdash;usually free, with the processor taking its normal card fee
            and nothing extra layered on by the platform.
          </li>
          <li>
            <strong>Hosting</strong> built for WooCommerce, typically
            $20&ndash;$80/month depending on traffic and whether it&apos;s
            managed.
          </li>
          <li>
            <strong>A handful of plugins</strong> for SEO, backups, and
            security&mdash;many with capable free tiers, unlike most Shopify app
            equivalents.
          </li>
          <li>
            <strong>Developer time</strong>, which is the real variable cost. A
            DIY-comfortable owner spends very little here; a store needing
            custom design or complex logic will pay for it, the same way a
            complex Shopify build needs a paid theme developer too.
          </li>
        </ul>
        <p className="mt-4">
          A comparable WordPress/WooCommerce store commonly lands at{" "}
          $40&ndash;$150/month all-in&mdash;lower than Shopify at the same
          feature level, mainly because there&apos;s no per-transaction platform
          fee stacking on every sale.
        </p>
      </>
    ),
  },
  {
    number: "04",
    title: "The number that actually decides it: transaction fees at scale",
    body: (
      <>
        <p>
          For a store doing $10,000/month in sales, a 1% transaction fee is
          $100/month&mdash;quietly larger than most individual app
          subscriptions, and it scales with revenue instead of staying flat. At
          $50,000/month, that&apos;s $500/month, every month, forever,
          regardless of how lean the rest of your stack is.
        </p>
        <p className="mt-4">
          WooCommerce has no equivalent platform fee. You pay your payment
          processor&apos;s standard rate either way, but nothing extra goes to
          the platform itself. This is the single biggest reason cost
          comparisons flip in WordPress&apos;s favor as revenue grows, even
          though Shopify can look cheaper at launch.
        </p>
      </>
    ),
  },
  {
    number: "05",
    title: "Where Shopify wins on cost instead",
    body: (
      <>
        <p>
          To be fair to Shopify: hosting, security, and uptime are bundled into
          the plan price, with no separate host to choose or manage.
          There&apos;s no developer needed to keep the store online, patched, or
          fast. For a store that wants zero infrastructure decisions and values
          that over lower fees, Shopify&apos;s price is buying real convenience,
          not just marketing.
        </p>
        <p className="mt-4">
          The trade-off is closer if you don&apos;t use a managed WordPress host
          and end up handling updates, backups, and security yourself
          &mdash;that time has a cost too, even if it never appears on an
          invoice.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "A simple way to run your own numbers",
    image: `${IMG_DIR}/06-cost-calculator-inputs.svg`,
    alt: "Diagram showing four inputs feeding a cost comparison: monthly revenue, app count, hosting tier, and developer hours",
    body: (
      <>
        <p>
          You don&apos;t need a spreadsheet consultant for this. Four inputs get
          you a real answer:
        </p>
        <ol className="list-decimal pl-6 mt-4 space-y-1">
          <li>
            Your average monthly revenue (transaction fees scale with this).
          </li>
          <li>How many paid apps or plugins your store actually needs.</li>
          <li>
            Your comfort level with basic WordPress maintenance, or the cost of
            paying someone else to handle it.
          </li>
          <li>
            Whether you value fixed monthly cost predictability over lower cost
            at scale.
          </li>
        </ol>
        <p className="mt-4">
          Low revenue, high app dependency, low DIY comfort: Shopify usually
          wins. Growing revenue, willingness to self-manage or use a managed
          host: WordPress usually wins, and the gap widens every month your
          revenue grows.
        </p>
      </>
    ),
  },
  {
    number: "07",
    title:
      "If the numbers point to WordPress, migration is the remaining question",
    body: (
      <>
        <p>
          Cost comparisons are only half the decision if you already have a
          running Shopify store&mdash;the other half is whether moving puts your
          existing rankings, reviews, and content at risk. That&apos;s a
          separate, solvable problem, not a reason to stay on a more expensive
          platform by default.
        </p>
        <p className="mt-4">
          We cover exactly what determines whether your SEO survives the move in{" "}
          <Link
            href={"/blog/will-you-lose-seo-rankings-shopify-to-wordpress"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            this breakdown
          </Link>
          , including what a proper export preserves automatically and
          what&apos;s still on you afterward.
        </p>
        <p className="mt-4">
          If you want to see what your own store&apos;s move would actually look
          like&mdash;slugs, categories, images, and all before committing to
          anything, this guide on{" "}
          <Link
            href={"/blog/how-to-migrate-shopify-products-to-wordpress"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            how to migrate shopify products to wordpress
          </Link>{" "}
          shows exactly how to achieve it with comparetively lesser DIY.
        </p>
      </>
    ),
  },
];

export default function ShopifyVsWordpressRealCostComparison() {
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
