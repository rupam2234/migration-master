import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import { StepTypes } from "./type";
import Link from "next/link";

const IMG_DIR = "/images/blog/posts/cart2cart-alternative-shopify-to-wordpress";

export const meta = {
  slug: "cart2cart-alternative-shopify-to-wordpress",
  title: "Cart2Cart Alternative for Shopify to WordPress Migration",
  description:
    "A straight comparison of Cart2Cart and Migration Master for moving a Shopify store to WordPress, what each one actually migrates, what setup looks like, and which one fits your situation.",
  author: "Migration Master Editorial Team",
  openGraph: {
    siteName: "Migration Master",
    images: `${IMG_DIR}/cover.png`,
  },
  icons: ["/images/icon.svg"],
};

const steps: StepTypes[] = [
  {
    number: "01",
    title: "Why people start looking for a Cart2Cart alternative",
    body: (
      <>
        <p>
          Cart2Cart has been around a long time and it works for a lot of
          people. It supports over 80 platforms, so if you&apos;ve ever searched
          for a migration tool, it&apos;s probably shown up first. For a general
          purpose &quot;move anything to anything&quot; service, that reach is
          genuinely useful.
        </p>
        <p className="mt-4">
          But most people comparing tools for a Shopify to WordPress move
          aren&apos;t migrating &quot;anything to anything.&quot; They have one
          specific job: get products, blog posts, pages, and images out of
          Shopify and into WordPress in a shape that doesn&apos;t need weeks of
          cleanup afterward. When the job is that specific, a general purpose
          tool starts showing its seams, and that&apos;s usually when people
          start typing &quot;Cart2Cart alternative&quot; into Google.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "What Cart2Cart actually does well",
    body: (
      <>
        <p>
          Before getting into where the two tools differ, it&apos;s worth being
          fair about what Cart2Cart handles well, since a lot of comparison
          posts skip this part.
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            It runs as a background service, so your Shopify store stays live
            and functional while the migration happens.
          </li>
          <li>
            It offers a free demo migration before you commit to a paid one,
            which is a genuinely reassuring way to test the waters.
          </li>
          <li>
            It moves order history and customer records in real depth, including
            billing and shipping details, which matters if your store has years
            of order data behind it.
          </li>
          <li>
            Its reach across 80-plus platforms means if you ever need to move
            somewhere other than WordPress, the same account and workflow can
            handle it.
          </li>
        </ul>
        <p className="mt-4">
          If your priority is a hands-off, white glove feeling migration and
          you&apos;re not too concerned with the finer points of how content
          lands on the WordPress side, Cart2Cart is a reasonable choice.
        </p>
      </>
    ),
  },
  {
    number: "03",
    title:
      "Where the gap shows up for a Shopify to WordPress move specifically",
    body: (
      <>
        <p>
          The catch is that Cart2Cart&apos;s WordPress side isn&apos;t really
          built around WordPress content. It&apos;s built around WooCommerce (or
          what they list as the &quot;WordPress eStore Plugin&quot;), meaning
          its focus is store entities such as products, orders, and customers.
          Your blog posts, pages, categories, and media library sit outside that
          core, which is fine if all you&apos;re moving is a catalog, but a real
          gap if your Shopify store also has years of blog content and static
          pages attached to it.
        </p>
        <p className="mt-4">
          A few other things show up once you get into the setup:
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            You need to install a plugin and hand over credentials on both the
            Shopify and WordPress side before anything moves.
          </li>
          <li>
            Images are typically offered as a paid add on rather than included
            by default, so a full catalog with product photography can cost more
            than the base estimate suggests.
          </li>
          <li>
            Pricing is quote based. Published estimates put a small store
            starting around $29, with typical full migrations landing somewhere
            between $69 and $300 depending on volume and the options you select.
            Your actual number depends on what you pick, so it&apos;s worth
            running the estimator yourself before comparing.
          </li>
        </ul>
      </>
    ),
  },
  {
    number: "04",
    title: "How Migration Master approaches the same move",
    body: (
      <>
        <p>
          Migration Master was built specifically for the Shopify to WordPress
          direction, which changes a few things about how it works.
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            No WordPress plugin to install. The output is a standard WXR file,
            the same format WordPress&apos;s own importer already expects, so
            you import it the normal way.
          </li>
          <li>
            No Shopify credentials to hand over long term. You connect with the
            permissions needed to generate the export, then disconnect.
          </li>
          <li>
            Products, orders, pages, blog posts, categories, and your media
            library all move in one pass, not just the store entities.
          </li>
          <li>
            Images keep their original filename and alt text by default,
            categories match by slug, and pages keep their original slugs, since
            preserving the URL structure is a big part of not losing search
            rankings during a migration.
          </li>
          <li>
            You see an itemized manifest, exactly how many products, posts,
            pages, and images will export, before you pay anything. Pricing is a
            flat per item rate rather than a custom quote.
          </li>
        </ul>
      </>
    ),
  },
  {
    number: "05",
    title: "Side by side",
    body: (
      <>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="py-2 pr-4 font-semibold">What matters</th>
                <th className="py-2 pr-4 font-semibold">Cart2Cart</th>
                <th className="py-2 font-semibold">Migration Master</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-primary/10">
                <td className="py-2 pr-4">Setup</td>
                <td className="py-2 pr-4">
                  Install a WordPress plugin, connect both stores
                </td>
                <td className="py-2">
                  Connect Shopify, no plugin needed on WordPress
                </td>
              </tr>
              <tr className="border-b border-primary/10">
                <td className="py-2 pr-4">Blog posts and pages</td>
                <td className="py-2 pr-4">
                  Not the core focus, built around store entities
                </td>
                <td className="py-2">Included alongside products by default</td>
              </tr>
              <tr className="border-b border-primary/10">
                <td className="py-2 pr-4">Images</td>
                <td className="py-2 pr-4">Usually a paid add on</td>
                <td className="py-2">
                  Included, original filename and alt text kept
                </td>
              </tr>
              <tr className="border-b border-primary/10">
                <td className="py-2 pr-4">See scope before paying</td>
                <td className="py-2 pr-4">Estimate, not itemized</td>
                <td className="py-2">Itemized manifest, free to review</td>
              </tr>
              <tr className="border-b border-primary/10">
                <td className="py-2 pr-4">Pricing</td>
                <td className="py-2 pr-4">
                  Custom quote, roughly $29 to $300+
                </td>
                <td className="py-2">
                  Flat per item rate, drops at higher volume
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Platform reach</td>
                <td className="py-2 pr-4">80+ platforms</td>
                <td className="py-2">Shopify and WordPress, done properly</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    number: "06",
    title: "A worked example",
    body: (
      <>
        <p>
          Say you&apos;re moving a Shopify store with 300 products, 80 blog
          posts, and 12 pages, so 392 items total.
        </p>
        <p className="mt-4">
          On Migration Master&apos;s per item pricing, that lands in the first
          tier at $0.10 per item, so roughly $39 for the full export, products,
          blog content, pages, and the images and categories that come with
          them, with the itemized manifest shown before you pay.
        </p>
        <p className="mt-4">
          On Cart2Cart, that same store would fall somewhere in the range
          published by third party write ups, likely in the $69 to $150 range
          for the base migration, before adding images as a separate option and
          before the blog content and pages are accounted for separately, since
          they sit outside the standard product migration.
        </p>
        <p className="mt-4">
          Your own numbers will vary. The point isn&apos;t that one price beats
          the other in every case, it&apos;s that Migration Master&apos;s model
          is easy to estimate yourself ahead of time, while Cart2Cart&apos;s
          depends on running their estimator and picking through add ons.
        </p>
      </>
    ),
  },
  {
    number: "07",
    title: "Which one actually fits your situation",
    body: (
      <>
        <p>Being honest about this cuts both ways.</p>
        <p className="mt-4">
          Cart2Cart makes more sense if you need to migrate from a platform
          other than Shopify, if you want a fully managed, white glove process
          handled entirely on their end, or if order and customer history is by
          far your biggest concern and content is an afterthought.
        </p>
        <p className="mt-4">
          Migration Master makes more sense if your Shopify store has real blog
          content and pages you don&apos;t want to lose, if you&apos;d rather
          see exactly what&apos;s exporting before you pay for anything, if you
          don&apos;t want to install a plugin or hand over long term store
          credentials, or if keeping your existing URL structure and search
          rankings intact matters as much as moving the products themselves.
        </p>
      </>
    ),
  },
  {
    number: "08",
    title: "How to try it",
    body: (
      <>
        <ol className="list-decimal pl-6 mt-4 space-y-1">
          <li>Connect your Shopify store.</li>
          <li>
            Review the itemized manifest, products, orders, pages, categories,
            and blog posts, with a count for each.
          </li>
          <li>
            Export, then import the WXR files through WordPress&apos;s own
            importer.
          </li>
        </ol>
        <p className="mt-4">
          For a full screenshot by screenshot walkthrough of that process, see{" "}
          <Link
            href={"/blog/how-to-migrate-shopify-products-to-wordpress"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            how to migrate Shopify products to WordPress
          </Link>
          . If pricing is your main question, the full breakdown of how the per
          item model works against quote based tools like Cart2Cart and
          LitExtension is covered in{" "}
          <Link
            href={"/blog/shopify-to-wordpress-price-comparison"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            Shopify to WordPress migration tool pricing
          </Link>
          . And if you&apos;re worried about what a migration does to your
          search rankings, that&apos;s covered in{" "}
          <Link
            href={"/blog/will-you-lose-seo-rankings-shopify-to-wordpress"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            will you lose SEO rankings migrating Shopify to WordPress
          </Link>
          .
        </p>
      </>
    ),
  },
];

export default function Cart2CartAlternativeShopifyToWordpress() {
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
