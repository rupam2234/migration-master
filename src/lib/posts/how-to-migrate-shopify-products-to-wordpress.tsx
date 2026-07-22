import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import Link from "next/link";

const IMG_DIR =
  "/images/blog/posts/how-to-migrate-shopify-products-to-wordpress";

export const meta = {
  slug: "how-to-migrate-shopify-products-to-wordpress",
  title: "How to Migrate Shopify Products to WordPress",
  description:
    "A screenshot-by-screenshot walkthrough of migrating a Shopify product catalog into WordPress and WooCommerce using Migration Master.",
  author: "Migration Master Editorial Team",
};

const steps = [
  {
    number: "01",
    title: "Know your destination before you export",
    image: `${IMG_DIR}/01-wordpress-destination.png`,
    alt: "WordPress/WooCommerce dashboard on the destination site",
    body: (
      <>
        <p>
          Before touching Shopify, it&apos;s worth glancing at the WordPress
          site you&apos;re migrating into. In this example, the destination is a
          staging WooCommerce site that&apos;s mid-setup — you can see
          WooCommerce&apos;s own &ldquo;Step 1 of 6&rdquo; setup checklist still
          showing, plus site stats like published posts and pages.
        </p>
        <p className="font-medium mt-4">The main things to check here:</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>
            <strong>WooCommerce is active</strong> (Products, Payments, and
            Analytics menu items appear in the sidebar once it is).
          </li>
          <li>
            The <strong>Site Health</strong> panel isn&apos;t flagging anything
            that would block imports.
          </li>
          <li>
            You know which <strong>user account</strong> new imported content
            should be attributed to.
          </li>
        </ul>
      </>
    ),
  },
  {
    number: "02",
    title: "Connect your Shopify store in Migration Master",
    image: `${IMG_DIR}/02-connect-shopify-store.png`,
    alt: "Export Shopify Contents dashboard with Pages, Blogs, Products, Orders, Articles, and Images",
    body: (
      <>
        <p>
          Head to{" "}
          <a
            href="https://migrationmaster.online"
            className="underline underline-offset-2 hover:text-orange-700"
          >
            migrationmaster.online
          </a>{" "}
          and add your store as a project. (You can read more on{" "}
          <Link
            href={"/blog/how-to-connect-shopify-to-migration-master"}
            className="underline underline-offset-2 hover:text-orange-700"
          >
            how to connect your shopify store with Migration Master
          </Link>
          ). Once the connection process is complete, select the project and you
          will land on the <strong>Export Shopify Contents</strong> dashboard.
        </p>
        <p className="mt-4">
          For a product migration, click <strong>Fetch</strong> on the{" "}
          <strong>Products</strong> card.
        </p>
      </>
    ),
  },
  {
    number: "03",
    title: "Review the export manifest and pick what to bring over",
    image: `${IMG_DIR}/03-export-manifest-review.png`,
    alt: "Table of exported Shopify products with checkboxes for selecting which ones to migrate",
    body: (
      <p>
        Migration Master shows every product it found in a searchable, sortable
        table. Uncheck anything you don&apos;t want migrated, then click{" "}
        <strong>Export [n] Records</strong>.
      </p>
    ),
  },
  {
    number: "04",
    title: "Confirm the export",
    image: `${IMG_DIR}/04-confirm-export-payment.png`,
    alt: "Confirm export dialog showing record count, coupon code field, and total cost",
    body: (
      <p>
        Confirm and pay to generate the package. Behind the scenes, the tool
        builds a <strong>WordPress eXtended RSS (WXR)</strong> file — the format
        WordPress&apos;s native importer expects.
      </p>
    ),
  },
  {
    number: "05",
    title: "Download the package",
    image: `${IMG_DIR}/05-download-wxr-package.png`,
    alt: "Windows File Explorer showing the downloaded WordPress import zip file",
    body: (
      <p>
        Extract the downloaded <code>.zip</code> — inside you&apos;ll find one
        or more <code>.xml</code> files ready to hand to WordPress.
      </p>
    ),
  },
  {
    number: "06",
    title: "Go to WordPress → Tools → Import",
    image: `${IMG_DIR}/06-wordpress-importer-list.png`,
    alt: "WordPress Import screen listing available importers, including WordPress and WooCommerce CSV",
    body: (
      <p>
        Skip <strong>WooCommerce products (CSV)</strong> — use{" "}
        <strong>WordPress</strong> instead, which reads the WXR file.
      </p>
    ),
  },
  {
    number: "07",
    title: "Upload the WXR file",
    image: `${IMG_DIR}/07-upload-wxr-file.png`,
    alt: "WordPress importer file upload screen with Choose File button",
    body: (
      <p>
        Choose the <code>.xml</code> file, then click{" "}
        <strong>Upload file and import</strong>.
      </p>
    ),
  },
  {
    number: "08",
    title: "Assign authors and import settings",
    image: `${IMG_DIR}/08-assign-authors-attachments.png`,
    alt: "Import settings screen for assigning authors and enabling attachment downloads",
    body: (
      <p>
        Assign an author, enable{" "}
        <strong>Download and import file attachments</strong>, and leave URL
        rewriting checked. Then <strong>Submit</strong>.
      </p>
    ),
  },
  {
    number: "09",
    title: "(Optional) Refine and re-export",
    image: `${IMG_DIR}/09-select-products-refined.png`,
    alt: "Export table with a refined, smaller selection of products checked",
    body: (
      <p>
        Go back to Migration Master, adjust your selection, and re-export just
        the records you need.
      </p>
    ),
  },
  {
    number: "10",
    title: "Verify in WordPress",
    image: `${IMG_DIR}/10-products-live-in-wordpress.png`,
    alt: "WooCommerce Products list showing successfully imported products with prices, stock, and categories",
    body: (
      <p>
        Head to <strong>Products → All Products</strong> and spot-check images,
        prices, stock, and categories.
      </p>
    ),
  },
];

export default function HowToMigrateShopifyProductsToWordPress() {
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
