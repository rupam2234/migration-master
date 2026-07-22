import BlogArticle from "@/components/blog/blogArticle";
import BlogHeader from "@/components/blog/blogHeader";
import BlogStep from "@/components/blog/blogStep";
import { StepTypes } from "./type";
import Link from "next/link";

const IMG_DIR = "/images/blog/posts/how-to-connect-shopify-to-migration-master";

export const meta = {
  slug: "how-to-connect-shopify-to-migration-master",
  title:
    "How to Connect a Shopify Store to Migration Master (in Under a Minute)",
  description:
    "A screenshot-by-screenshot walkthrough of connecting a Shopify store to Migration Master, from entering your store domain to a confirmed connection.",
  author: "Migration Master Editorial Team",
};

const steps: StepTypes[] = [
  {
    number: "01",
    title: "Start a new project and open the Shopify connection screen",
    image: `${IMG_DIR}/01-connect-shopify-store-screen.png`,
    alt: "Migration Master new project screen with a Connect a Shopify store panel",
    body: (
      <>
        <p>
          From your Migration Master dashboard, click{" "}
          <strong>+ Add a new project</strong>. You&apos;ll land on the{" "}
          <strong>Connect a Shopify store</strong> screen, which asks for your
          Shopify store domain.
        </p>
      </>
    ),
  },
  {
    number: "02",
    title: "Enter your Shopify store domain",
    image: `${IMG_DIR}/02-enter-store-domain.png`,
    alt: "Shopify store domain field filled in with a .myshopify.com address",
    body: (
      <>
        <p>
          Type in your store&apos;s domain in the format{" "}
          <code>your-store.myshopify.com</code>, then click{" "}
          <strong>Connect Shopify</strong>.
        </p>
        <p className="mt-4">
          A quick note before you continue: Shopify handles authentication
          securely, and connecting does require installing a small plugin (this
          happens automatically). Once your migration is complete, you can
          remove the app from your store instantly.
        </p>
        <p className="mt-4">
          This redirects you to Shopify itself to complete the connection — your
          credentials are never entered directly into Migration Master.
        </p>
      </>
    ),
  },
  {
    number: "03",
    title: "Review the permissions Shopify is asking for",
    image: `${IMG_DIR}/03-shopify-permissions-screen.png`,
    alt: "Shopify Install app screen listing the data the migration-master-connector app needs access to",
    body: (
      <>
        <p>
          Shopify shows exactly what the{" "}
          <strong>migration-master-connector</strong> app will be able to see:
          customer data, staff and contributor data, and store data such as
          products, orders, and Online Store pages.
        </p>
        <p className="mt-4">
          You can expand each section to see the specifics before continuing —
          Shopify also confirms that the app meets its data handling and privacy
          requirements.
        </p>
      </>
    ),
  },
  {
    number: "04",
    title: "Install the app",
    body: (
      <p>
        Click <strong>Install</strong>. Shopify installs the connector app on
        your store and redirects you back to the Migration Master connection
        page.
      </p>
    ),
  },
  {
    number: "05",
    title: "Let the connection finish syncing",
    image: `${IMG_DIR}/05-connection-status-pending.png`,
    alt: "Migration master connection page briefly showing a not-connected status while the connection finishes",
    body: (
      <>
        <p>
          You may briefly see a message saying Shopify isn&apos;t connected yet
          — this is normal right after installing. Give it a moment (or refresh)
          while Shopify and Migration Master finish handshaking.
        </p>
        <p>
          Once it&apos;s done, the status updates to{" "}
          <strong>Shopify is connected successfully</strong>, showing your
          store&apos;s domain. From here, click{" "}
          <strong>Open Migration Dashboard</strong> to jump back into Migration
          Master.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "You're ready to migrate",
    image: `${IMG_DIR}/06-export-shopify-contents-dashboard.png`,
    alt: "Export Shopify Contents dashboard with cards for Pages, Blogs, Products, Orders, Articles, and Images",
    body: (
      <p>
        Your store now appears in the project selector, and you land on the{" "}
        <strong>Export Shopify Contents</strong> dashboard — with Pages, Blogs,
        Products, Orders, and more, all ready to <strong>Fetch</strong> whenever
        you want to{" "}
        <Link
          href={"/blog/how-to-migrate-shopify-products-to-wordpress"}
          className="underline underline-offset-2 hover:text-orange-700"
        >
          start exporting
        </Link>
        .
      </p>
    ),
  },
];

export default function HowToConnectShopifyToMigrationMaster() {
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
