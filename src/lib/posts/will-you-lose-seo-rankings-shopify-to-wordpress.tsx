import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import { StepTypes } from "./type";
import Link from "next/link";

const IMG_DIR =
  "/images/blog/posts/will-you-lose-seo-rankings-shopify-to-wordpress";

export const meta = {
  slug: "will-you-lose-seo-rankings-shopify-to-wordpress",
  title: "Will You Lose SEO Rankings Migrating Shopify to WordPress?",
  description:
    "The four things that actually decide whether your rankings survive a Shopify to WordPress migration, what Migration Master preserves automatically, and what you still have to do yourself.",
  author: "Migration Master Editorial Team",
};

const steps: StepTypes[] = [
  {
    number: "01",
    title: "The fear is reasonable  the numbers back it up",
    body: (
      <>
        <p>
          If you&apos;ve run a Shopify store for a few years, your product
          pages, collection pages, and blog posts aren&apos;t just
          contentthey&apos;re assets. Rankings you didn&apos;t pay for, built up
          post by post. That&apos;s exactly what a badly handled migration puts
          at risk.
        </p>
        <p className="mt-4">
          Industry write-ups on <strong>Shopify-to-WordPress</strong> moves cite
          recovery timelines stretching well past a year when redirects and URL
          structure aren&apos;t handled correctly, with some stores losing half
          their organic traffic in the process. That&apos;s not a technicality,
          it&apos;s the difference between a migration that pays for itself and
          one that costs you a year of pipeline.
        </p>
        <p className="mt-4">
          The good news: almost none of that risk comes from the actual data
          transfer. It comes from four specific things either being handled or
          not.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "The four things that actually decide this",
    image: `${IMG_DIR}/02-four-ranking-levers.svg`,
    alt: "Diagram showing four levers that determine SEO outcome: URL and slug parity, 301 redirects, image continuity, and internal links",
    body: (
      <>
        <p>Every migration post-mortem comes back to the same four levers:</p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            <strong>URL and slug parity</strong>does the new page live at a path
            Google already recognizes?
          </li>
          <li>
            <strong>301 redirects</strong>does the old address point at the new
            one?
          </li>
          <li>
            <strong>Image continuity</strong>do your images keep their alt text
            and filenames, or do they show up as generic, unindexed files?
          </li>
          <li>
            <strong>Internal links</strong>do your posts and pages still link to
            each other correctly after the move?
          </li>
        </ul>
        <p className="mt-4">
          Get all four right and search engines mostly treat the migration as a
          non-event. Get one wrong at scale and you&apos;re re-earning rankings
          you already had.
        </p>
      </>
    ),
  },
  {
    number: "03",
    title: "URL and slug parity: the one that matters most",
    body: (
      <>
        <p>
          A ranking is tied to a URL, not to a platform. If{" "}
          <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
            /products/canvas-tote-bag
          </code>{" "}
          becomes{" "}
          <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
            /product/canvas-tote-bag-2
          </code>{" "}
          after migration, you haven&apos;t moved a rankingyou&apos;ve created a
          new page and abandoned an old one, from Google&apos;s perspective.
        </p>
        <p className="mt-4">
          This is where hand migrations and CSV-based tools tend to lose the
          most ground: bulk importers frequently append IDs, change casing, or
          restructure paths to fit their own schema. Every one of those changes
          is a small rankings reset.
        </p>
      </>
    ),
  },
  {
    number: "04",
    title: "301 redirects: closing the loop",
    image: `${IMG_DIR}/04-redirect-chain.svg`,
    alt: "Diagram showing a 301 redirect chain from an old Shopify URL through a search engine to the new WordPress URL",
    body: (
      <>
        <p>
          Even with perfect slugs, your old Shopify domain still exists in
          Google&apos;s index, in backlinks from other sites, and in
          people&apos;s bookmarks. A{" "}
          <strong>301 redirect tells search engines (and browsers)</strong> that
          the move is permanent, so ranking signal flows to the new address
          instead of dead-ending.
        </p>
        <p className="mt-4">
          This part happens outside any migration toolit&apos;s a rule you add
          at the DNS or host level once your new WordPress site is live, or
          Shopify-side if you&apos;re keeping the old domain temporarily. Build
          your redirect map from the export manifest before you cut over, not
          after.
        </p>
      </>
    ),
  },
  {
    number: "05",
    title: "Image continuity: the quiet ranking leak",
    body: (
      <>
        <p>
          Product and blog images carry their own search valuealt text ranks in
          image search, and filenames are a minor but real relevance signal.
          Migrations that re-upload images through a generic importer often
          strip both, replacing{" "}
          <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
            canvas-tote-bag-natural.jpg
          </code>{" "}
          with{" "}
          <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
            image-047.jpg
          </code>{" "}
          and a blank alt attribute.
        </p>
        <p className="mt-4">
          It&apos;s invisible until you check Google Image Search referrals a
          few months later and notice they&apos;ve gone quiet.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "Internal links: what carries over automatically",
    body: (
      <>
        <p>
          A blog post that links to three product pages and two other articles
          is only as strong as those links staying intact. If posts and pages
          import as flat, disconnected content, you lose the internal linking
          structure that helped those pages rank in the first place, and
          you&apos;re left rebuilding it by hand across hundreds of posts.
        </p>
      </>
    ),
  },
  {
    number: "07",
    title: "What Migration Master preserves automatically",
    body: (
      <>
        <p>
          This is where the export format does real work. Migration Master
          builds standard WordPress WXR files not a generic CSV and a few things
          fall out of that by default:
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            <strong>Pages keep their original slugs</strong>, so paths that were
            already indexed don&apos;t shift under you.
          </li>
          <li>
            <strong>Categories match by slug</strong>, so collection and blog
            category pages file into the right place instead of getting
            flattened into &quot;Uncategorized.&quot;
          </li>
          <li>
            <strong>Images keep their original filename and alt text</strong>,
            so nothing in your media library shows up blank or generically
            named.
          </li>
          <li>
            <strong>
              Blog posts keep their author, publish date, and full HTML body
            </strong>
            , linked back to the correct category, so internal structure
            survives the move instead of being rebuilt from scratch.
          </li>
        </ul>
        <p className="mt-4">
          You still see all of this before paying for anythingthe itemized
          manifest shows exactly what will export, slugs and all, so there are
          no surprises once it lands in WordPress.
        </p>
      </>
    ),
  },
  {
    number: "08",
    title: "What's still on you",
    body: (
      <>
        <p>
          To be direct about scope: Migration Master moves and preserves your
          content, it doesn&apos;t manage your DNS or hosting. Two things remain
          your responsibility after export:
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            Setting up the actual 301 redirect rules once your new WordPress
            site is live (your host or DNS provider handles this).
          </li>
          <li>
            Resubmitting your sitemap and requesting indexing in Google Search
            Console after cutover.
          </li>
        </ul>
        <p className="mt-4">
          Because your slugs don&apos;t change on export, your redirect map is
          simplerin most cases it&apos;s the old domain pointing at the same
          path on the new one, rather than a path-by-path remap.
        </p>
      </>
    ),
  },
  {
    number: "09",
    title: "A short post-migration checklist",
    body: (
      <>
        <ol className="list-decimal pl-6 mt-4 space-y-1">
          <li>Record current rankings and top pages before you cut over.</li>
          <li>Set up 301 redirects from old URLs to new ones.</li>
          <li>Submit the new sitemap in Google Search Console.</li>
          <li>
            Spot-check your 10 highest-traffic pages for correct slug, images,
            and internal links.
          </li>
          <li>Watch Search Console for crawl errors in the first 2-4 weeks.</li>
        </ol>
        <p className="mt-4">
          Get the export right and this list is maintenance, not damage control.
          See exactly what will export and how your slugs and categories will
          land with a{" "}
          <Link
            href={"/blog/how-to-migrate-shopify-products-to-wordpress"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            free manifest preview
          </Link>{" "}
          before you commit to anything.
        </p>
      </>
    ),
  },
];

export default function WillYouLoseSeoRankingsShopifyToWordpress() {
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
