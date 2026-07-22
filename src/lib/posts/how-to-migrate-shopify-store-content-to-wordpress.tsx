import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import { StepTypes } from "./type";
import Link from "next/link";

const IMG_DIR =
  "/images/blog/posts/how-to-migrate-shopify-store-content-to-wordpress";

export const meta = {
  slug: "how-to-migrate-shopify-store-content-to-wordpress",
  title:
    "How to Easily Migrate Shopify Products, Orders, Pages, and Images to WordPress",
  description:
    "What actually moves, why migrations run into trouble, and a screenshot-by-screenshot walkthrough for moving your Shopify store — pages, blogs, products, orders, and images — into WordPress with Migration Master, including what it costs.",
  author: "Migration Master Editorial Team",
};

const steps: StepTypes[] = [
  {
    number: "01",
    title: "The real cost of a migration going sideways",
    body: (
      <>
        <p>
          A migration rarely fails because the wrong file format got used. It
          fails because nobody knew the true scope going ina &quot;quick
          move&quot; that was quoted for a weekend turns into weeks of staff
          time nobody budgeted for. That&apos;s a real cost even before anything
          breaks.
        </p>
        <p className="mt-4">
          When product images or blog media don&apos;t come across cleanly,
          customers see it immediatelybroken photos and missing content read as
          a broken store, not a backend issue. And if URLs shift without
          redirects in place, the traffic and rankings built up over years can
          quietly disappear.
        </p>
        <p className="mt-4">
          None of this shows up on a quote until it&apos;s already happened. The
          businesses that come out fine are the ones that know exactly
          what&apos;s moving, and roughly what it costs, before they commit to
          anything.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "Where Migration Master fits in",
    body: (
      <>
        <p>
          Migration Master connects to your Shopify store and shows you an
          itemized manifest every page, post, category, and image it found
          before you pay for anything. You know the real scope, and the real
          cost, upfront.
        </p>
        <p className="mt-4">
          It builds WordPress-ready WXR files directly, so categories, image
          attachments, and slugs carry over intact instead of getting flattened
          and rebuilt by hand. That&apos;s less staff time spent fixing things
          after the fact, and fewer broken links for customers or search engines
          to run into.
        </p>
      </>
    ),
  },
  {
    number: "03",
    title: "Connect your Shopify store to Migration Master",
    image: `${IMG_DIR}/03-export-shopify-contents-dashboard.png`,
    alt: "Migration Master dashboard with the Export Shopify Contents screen after connecting a store",
    body: (
      <>
        <p>
          Before you can migrate anything, Migration Master needs read access to
          your Shopify store. If you haven&apos;t done this yet, follow our
          guide on{" "}
          <Link
            href={"/blog/how-to-connect-shopify-to-migration-master"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            how to connect a Shopify store to Migration Master
          </Link>{" "}
          it takes under a minute.
        </p>
        <p className="mt-4">
          Once connected, select your store from the project selector and
          you&apos;ll land on the <strong>Export Shopify Contents</strong>{" "}
          dashboard, with separate cards for Pages, Blogs, Products, Orders,
          Articles, and Images.
        </p>
      </>
    ),
  },
  {
    number: "04",
    title: "Decide what you actually need to bring over",
    body: (
      <>
        <p>
          You don&apos;t have to migrate everything in one pass. Most stores
          moving to WordPress/WooCommerce care most about:
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-1">
          <li>
            <strong>Products</strong>titles, descriptions, variants, prices, and
            stock.
          </li>
          <li>
            <strong>Orders</strong>order history, line items, and customer
            details.
          </li>
          <li>
            <strong>Pages &amp; Blogs/Articles</strong>your store&apos;s content
            pages and blog posts.
          </li>
          <li>
            <strong>Images</strong>product photos, blog images, and other media.
          </li>
        </ul>
        <p className="mt-4">
          Each card is fetched and exported independently, so you can start with
          Products today and come back for Orders or Pages later.
        </p>
      </>
    ),
  },
  {
    number: "05",
    title: "Fetch a content type",
    body: (
      <p>
        Click <strong>Fetch</strong> on any cardProducts, Orders, Pages, Blogs,
        Articles, or Imagesto pull that content in from Shopify. Repeat for each
        content type you want to migrate.
      </p>
    ),
  },
  {
    number: "06",
    title: "Review the export manifest and pick what to bring over",
    image: `${IMG_DIR}/06-review-export-manifest.png`,
    alt: "Searchable table of fetched Shopify records with checkboxes for selecting which ones to export",
    body: (
      <>
        <p>
          Migration Master shows every record it foundproducts, orders, pages,
          and so onin a searchable, sortable table. Uncheck anything you
          don&apos;t want migrated, then click{" "}
          <strong>Export [n] Records</strong>.
        </p>
        <p className="mt-4">
          This is the easiest point to leave out test orders, draft pages, or
          discontinued products before they ever reach WordPress.
        </p>
      </>
    ),
  },
  {
    number: "07",
    title: "Confirm and generate the export package",
    body: (
      <p>
        Confirm and pay to generate the package. Behind the scenes, Migration
        Master builds a <strong>WordPress eXtended RSS (WXR)</strong> file for
        each content typethe format WordPress&apos;s native importer expects,
        including image references for attachments like product photos and blog
        images.
      </p>
    ),
  },
  {
    number: "08",
    title: "Download and unzip the package",
    image: `${IMG_DIR}/08-download-package.png`,
    alt: "File explorer showing the downloaded WordPress import zip file",
    body: (
      <p>
        Extract the downloaded <code>.zip</code> fileinside you&apos;ll find one
        or more <code>.xml</code> files, one per content type, ready to hand to
        WordPress.
      </p>
    ),
  },
  {
    number: "09",
    title: "Go to WordPress → Tools → Import",
    body: (
      <p>
        In your WordPress admin, go to <strong>Tools → Import</strong> and run
        the <strong>WordPress</strong> importer (not WooCommerce products CSV)
        it&apos;s the one that reads WXR files and handles pages, blogs,
        products, and orders alike.
      </p>
    ),
  },
  {
    number: "10",
    title: "Upload each WXR file",
    body: (
      <p>
        Choose the <code>.xml</code> file for the content type you&apos;re
        importing, then click <strong>Upload file and import</strong>. If you
        exported multiple content types, repeat this step for each file.
      </p>
    ),
  },
  {
    number: "11",
    title: "Assign authors and download attachments",
    image: `${IMG_DIR}/11-assign-authors-attachments.png`,
    alt: "Import settings screen for assigning authors and enabling attachment downloads",
    body: (
      <>
        <p>
          Assign an author for the imported content, and make sure{" "}
          <strong>Download and import file attachments</strong> is checked this
          is what pulls your Shopify images into WordPress&apos; media library
          instead of just linking back to Shopify. Leave URL rewriting checked,
          then click <strong>Submit</strong>.
        </p>
      </>
    ),
  },
  {
    number: "12",
    title: "Is it actually worth paying for?",
    body: (
      <>
        <p>
          Migration Master charges per item exported $0.20 an item, $1 minimum
          rather than a flat fee. A store with roughly 4,300 items (images,
          articles, pages, and categories combined) lands around $870, which
          sits comfortably inside the $300–$1,000 range that DIY migration apps
          typically charge for a full store move.
        </p>
        <p className="mt-4">
          The per-item model matters most at the edges. A flat-fee tool either
          overcharges a small blog with a couple hundred items, or underprices a
          20,000-item catalog relative to the work involved. Paying by volume
          means a five-page brochure site and a content-heavy store both pay
          roughly what their size warrants.
        </p>
        <p className="mt-4">
          Full-service agencies charge $15,000–$50,000 for comparable mid-market
          migrations, mainly for hands-on QA and custom rebuild work. If
          you&apos;re comfortable running the WordPress import yourself, that
          gap is the cost you&apos;re avoiding you&apos;re paying for the
          export, not a project team.
        </p>
      </>
    ),
  },
  {
    number: "13",
    title: "Verify everything landed correctly",
    image: `${IMG_DIR}/12-verify-imported-content.png`,
    alt: "WordPress and WooCommerce screens showing imported products, orders, pages, and images",
    body: (
      <>
        <p>
          Spot-check each area: <strong>Products → All Products</strong> for
          prices and stock, <strong>WooCommerce → Orders</strong> for order
          history, <strong>Pages</strong> and <strong>Posts</strong> for your
          site content, and <strong>Media Library</strong> to confirm images
          came across.
        </p>
        <p className="mt-4">
          If anything&apos;s missing, head back to Migration Master, refine your
          selection on the export table, and re-export just the records you
          need.
        </p>
      </>
    ),
  },
];

export default function HowToMigrateShopifyStoreContentToWordPress() {
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
