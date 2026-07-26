import { Footer, Header } from "@/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Migration Master",
  description:
    "How Migration Master collects, uses, and protects your data when you migrate content between Shopify and WordPress.",
};

const sections = [
  {
    title: "1. Information We Collect",
    body: (
      <>
        <p className="font-medium text-slate-800">
          a) Information you provide directly
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Contact details (such as your email address) when you create an
            account, contact support, or sign up for updates.
          </li>
          <li>
            Billing information necessary to process payment (handled by our
            third-party payment processor — we do not store full card numbers).
          </li>
        </ul>

        <p className="mt-4 font-medium text-slate-800">
          b) Information from connected stores
        </p>
        <p className="mt-2">
          When you connect a Shopify or WordPress store to generate an export,
          we access only what&apos;s needed to build your export files, which
          may include:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Products, prices, and inventory data</li>
          <li>Order history and line items</li>
          <li>
            Customer details attached to orders (e.g., names, emails, shipping
            addresses)
          </li>
          <li>Blog posts, pages, and associated metadata</li>
          <li>Media library files (images) and their filenames/alt text</li>
          <li>Store structure such as categories and slugs</li>
        </ul>
        <p className="mt-2">
          We request the minimum store permissions (scopes) needed to generate
          your export, and do not request or store your store login credentials
          — connections are made via secure, revocable API authorization.
        </p>

        <p className="mt-4 font-medium text-slate-800">
          c) Automatically collected information
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Usage data (pages visited, actions taken on the dashboard,
            approximate export size)
          </li>
          <li>Device and browser information, IP address</li>
          <li>Cookies and similar technologies (see Section 6)</li>
        </ul>
      </>
    ),
  },
  {
    title: "2. How We Use Your Information",
    body: (
      <>
        <p>We use the information above to:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Generate, preview, and deliver your export files</li>
          <li>Process payments and maintain billing records</li>
          <li>Provide customer support and respond to inquiries</li>
          <li>Maintain, secure, and improve the Service</li>
          <li>
            Send transactional communications (e.g., export status, receipts)
          </li>
          <li>Comply with legal obligations</li>
        </ul>
        <p className="mt-3">
          We do not sell your personal information or the customer/order data
          from your connected store to third parties.
        </p>
      </>
    ),
  },
  {
    title: "3. How Long We Keep Data",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <span className="font-medium text-slate-800">
            Store content used to generate exports
          </span>{" "}
          (products, orders, media, etc.) is retained only as long as necessary
          to generate and deliver your export files, and is deleted from our
          systems shortly after — typically within 30 days, unless you request
          earlier deletion.
        </li>
        <li>
          <span className="font-medium text-slate-800">
            Account and billing records
          </span>{" "}
          are kept as long as needed for legal, tax, and accounting purposes.
        </li>
        <li>
          You may request deletion of your account and associated data at any
          time (see Section 8).
        </li>
      </ul>
    ),
  },
  {
    title: "4. Sharing of Information",
    body: (
      <>
        <p>We may share information with:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-slate-800">
              Service providers
            </span>{" "}
            who help us operate the Service, such as hosting providers and
            payment processors, under obligations to protect your data.
          </li>
          <li>
            <span className="font-medium text-slate-800">
              Legal authorities
            </span>
            , where required by law, regulation, or valid legal process.
          </li>
          <li>
            <span className="font-medium text-slate-800">
              A successor entity
            </span>
            , in the event of a merger, acquisition, or sale of assets — with
            notice to you where required.
          </li>
        </ul>
        <p className="mt-3">
          We do not share the personal data contained in your store&apos;s
          orders/customers with any party other than those strictly necessary to
          generate and deliver your export.
        </p>
      </>
    ),
  },
  {
    title: "5. International Data Transfers",
    body: (
      <p>
        Our infrastructure and support may be located in different countries,
        including India. Where we process personal data originating from the
        European Economic Area (EEA), UK, or other regions with data transfer
        restrictions, we take reasonable steps to ensure appropriate safeguards
        are in place.
      </p>
    ),
  },
  {
    title: "6. Cookies",
    body: (
      <p>
        We use cookies and similar technologies to keep you logged in, remember
        preferences, and understand{" "}
        <a className="underline hover:text-[#a23b2e]" href="/terms-of-service">
          how the Service is used
        </a>
        . You can control cookies through your browser settings; disabling some
        cookies may affect functionality.
      </p>
    ),
  },
  {
    title: "7. Data Security",
    body: (
      <p>
        We use reasonable technical and organizational measures (such as
        encrypted connections and access controls) to protect your data. No
        method of transmission or storage is 100% secure, and we cannot
        guarantee absolute security.
      </p>
    ),
  },
  {
    title: "8. Your Rights and Choices",
    body: (
      <>
        <p>Depending on your location, you may have rights to:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Access, correct, or delete personal data we hold about you</li>
          <li>Object to or restrict certain processing</li>
          <li>Request a copy of your data in a portable format</li>
          <li>Withdraw consent where processing is based on consent</li>
        </ul>
        <p className="mt-3">
          This includes rights available under applicable laws such as the EU/UK
          GDPR, and India&apos;s Digital Personal Data Protection Act, 2023,
          where relevant. To exercise any of these rights, contact us at
          support@migrationmaster.online. We may need to verify your identity
          before fulfilling a request.
        </p>
        <p className="mt-3">
          If your store&apos;s customer data is included in an export, requests
          about that data (e.g., a customer of your store) should generally be
          directed to you as the store owner, since you control that data; we
          act on your instructions when generating exports.
        </p>
      </>
    ),
  },
  {
    title: "9. Children's Privacy",
    body: (
      <p>
        The Service is not directed to individuals under 18, and we do not
        knowingly collect personal information from children.
      </p>
    ),
  },
  {
    title: "10. Third-Party Links",
    body: (
      <p>
        Our Service may link to third-party sites (e.g., WordPress or Shopify
        documentation). We are not responsible for the privacy practices of
        those third parties.
      </p>
    ),
  },
  {
    title: "11. Changes to This Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be reflected by updating the &ldquo;Last updated&rdquo; date above,
        and where appropriate, we will provide additional notice.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header nav={false} />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: July 26, 2026
        </p>

        <p className="mt-6 text-slate-600">
          Migration Master (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
          &ldquo;our&rdquo;) provides a tool that helps users export and migrate
          content between Shopify and WordPress. This Privacy Policy explains
          what information we collect, how we use it, and the choices you have.
          Migration Master is operated by an individual (sole proprietor) based
          in India, and can be reached at{" "}
          <a
            href="mailto:support@migrationmaster.online"
            className="font-medium text-indigo-600 underline underline-offset-2 hover:text-[#a23b2e]"
          >
            support@migrationmaster.online
          </a>
          .
        </p>
        <p className="mt-3 text-slate-600">
          By using migrationmaster.online (the &ldquo;Service&rdquo;), you agree
          to the practices described here. If you do not agree, please do not
          use the Service.
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-slate-900">
                {section.title}
              </h2>
              <div className="mt-2 space-y-1.5 text-slate-600">
                {section.body}
              </div>
            </section>
          ))}

          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              12. Contact Us
            </h2>
            <p className="mt-2 text-slate-600">
              Questions about this Privacy Policy or how your data is handled
              can be sent to:
            </p>
            <p className="mt-1 text-slate-600">
              Email:{" "}
              <a
                href="mailto:support@migrationmaster.online"
                className="font-medium text-indigo-600 underline underline-offset-2 hover:text-[#a23b2e]"
              >
                support@migrationmaster.online
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
