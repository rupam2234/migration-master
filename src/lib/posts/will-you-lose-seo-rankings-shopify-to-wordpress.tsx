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
  openGraph: {
    siteName: "Migration Master",
    images: `${IMG_DIR}/02-four-ranking-levers.svg`,
  },
  icons: ["/images/icon.svg"],
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
          Industry write-ups on <strong>Shopify to WordPress</strong> moves cite
          recovery timelines stretching well past a year when redirects and URL
          structure aren&apos;t handled correctly, with some stores losing half
          their organic traffic in the process. That&apos;s not a technicality,
          it&apos;s the difference between a migration that pays for itself and
          one that costs you a year of pipeline.
        </p>
        <p className="mt-4">
          The good news is almost none of that risk comes from the actual data
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
            <strong>URL and slug parity</strong> does the new page live at a
            path Google already recognizes?
          </li>
          <li>
            <strong>Imported URL rewriting</strong> do links inside your posts
            and pages update to the new WordPress URLs instead of continuing to
            point at the old Shopify site?
          </li>
          <li>
            <strong>Image continuity</strong> do your images keep their alt text
            and filenames, or do they show up as generic, unindexed files?
          </li>
          <li>
            <strong>Internal links</strong> do your posts and pages still link
            to each other correctly after the move?
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
    title: "Imported URL rewriting: keeping your content connected",
    image: `${IMG_DIR}/04-redirect-chain.svg`,
    alt: "Diagram showing a 301 redirect chain from an old Shopify URL through a search engine to the new WordPress URL",
    body: (
      <>
        <p>
          During the WordPress import, leave{" "}
          <strong>
            &quot;Change all imported URLs that currently link to the previous
            site&quot;
          </strong>{" "}
          enabled. This updates links inside your imported posts and pages so
          they point to your new WordPress content instead of the old Shopify
          URLs.
        </p>

        <p className="mt-4">
          Combined with <strong>Download and import file attachments</strong>,
          this helps preserve your internal linking structure and media
          references without requiring you to manually edit hundreds of posts
          after the migration.
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
  {
    number: "10",
    title: "A worked example: redirecting a real Shopify store",
    body: (
      <>
        <p>
          Here&apos;s what this looks like end to end, using a typical store
          moving from{" "}
          <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
            yourstore.com
          </code>{" "}
          on Shopify to the same domain on WordPress.
        </p>
        <ol className="list-decimal pl-6 mt-4 space-y-3">
          <li>
            <strong>Export with Migration Master</strong> and check the
            manifest. Say it shows products living at{" "}
            <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
              /product/canvas-tote-bag
            </code>{" "}
            in WordPress, versus{" "}
            <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
              /products/canvas-tote-bag
            </code>{" "}
            on Shopify. That&apos;s the only structural change you need a rule
            for&mdash;everything else (blog posts, pages) keeps its slug.
          </li>
          <li>
            <strong>Point DNS at your new host</strong> once the WordPress
            import is complete and you&apos;ve spot-checked it.
          </li>
          <li>
            <strong>Add one wildcard redirect rule</strong> instead of hundreds
            of individual ones. If your host uses Apache, this goes in your{" "}
            <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
              .htaccess
            </code>
            :
            <pre className="bg-primary/10 p-3 rounded-sm mt-2 overflow-x-auto">
              <code>{`RedirectMatch 301 ^/products/(.*)$ /product/$1`}</code>
            </pre>
            This single line catches every product URL automatically&mdash;
            <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
              /products/canvas-tote-bag
            </code>{" "}
            now 301s to{" "}
            <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
              /product/canvas-tote-bag
            </code>
            .
          </li>
          <li>
            <strong>Leave blog and page URLs alone.</strong> Since Migration
            Master preserves those slugs exactly, a post that lived at{" "}
            <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
              /blogs/news/sustainable-packaging
            </code>{" "}
            needs its own redirect only if your Shopify blog prefix (
            <code className="bg-primary/10 px-2 py-0.5 rounded-sm">
              /blogs/news/
            </code>
            ) differs from your new WordPress permalink structure. If they
            match, no rule is needed at all.
          </li>
          <li>
            <strong>Test before you celebrate.</strong> Visit five or six of
            your top-ranking old URLs directly and confirm each one lands on the
            correct new page with a 301 (not a 302)&mdash;most browser dev tools
            show this under the Network tab.
          </li>
          <li>
            <strong>Submit your sitemap</strong> in Google Search Console and
            watch the Coverage report for the next few weeks for any 404s the
            wildcard missed.
          </li>
        </ol>
        <p className="mt-4">
          That&apos;s the whole redirect job for most stores: one wildcard rule
          for the product path change, plus a handful of one-off checks for
          anything that doesn&apos;t match the pattern.
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
