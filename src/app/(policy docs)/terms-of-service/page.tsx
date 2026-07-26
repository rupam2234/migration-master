import { Footer, Header } from "@/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Migration Master",
  description:
    "The terms that govern your use of Migration Master's Shopify to WordPress and WordPress to Shopify migration tool.",
};

const sections = [
  {
    title: "1. What We Do",
    body: (
      <p>
        Migration Master helps you export content (such as products, orders,
        pages, blog posts, media, and categories) from a Shopify or WordPress
        store and package it into files (e.g., WXR) that can be imported into
        another platform using that platform&apos;s own import tools. We do not
        perform the import for you, and we are not affiliated with, endorsed by,
        or sponsored by Shopify Inc. or WordPress/Automattic.
      </p>
    ),
  },
  {
    title: "2. Eligibility and Accounts",
    body: (
      <p>
        You must be at least 18 years old and have the authority to connect the
        store(s) you submit for migration (e.g., as the store owner or an
        authorized administrator). You are responsible for maintaining the
        confidentiality of your account and for all activity under it.
      </p>
    ),
  },
  {
    title: "3. Store Connections and Authorization",
    body: (
      <p>
        When you connect a store, you authorize us to access the specific data
        needed to generate your export (see our{" "}
        <a className="underline hover:text-[#a23b2e]" href="/privacy-policy">
          Privacy Policy
        </a>
        ). You represent that you have the legal right to export this data,
        including any customer or order data contained in your store, and that
        doing so complies with your own obligations to your customers (e.g.,
        your own privacy policy and applicable law). You may disconnect your
        store at any time.
      </p>
    ),
  },
  {
    title: "4. Pricing and Payment",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          The Service is billed per item exported (e.g., per product, order,
          page, blog post, image, or category), at the rate displayed on the
          Pricing page at the time of your export.
        </li>
        <li>
          Before payment, you will be shown an itemized manifest listing exactly
          what will be exported. Your final charge is based on that confirmed
          manifest.
        </li>
        <li>
          Prices are subject to change; changes will not affect a manifest you
          have already confirmed and paid for.
        </li>
        <li>
          Payment is processed by a third-party payment provider. We do not
          store your full payment card details.
        </li>
      </ul>
    ),
  },
  {
    title: "5. Refunds",
    body: (
      <p>
        Please see our Refund Policy for details on when refunds are available.
        In general, because you review and confirm an itemized manifest before
        paying, charges are considered final once export files matching that
        manifest have been generated and made available to you, except as
        described in the Refund Policy.
      </p>
    ),
  },
  {
    title: "6. Acceptable Use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Use the Service to export or process data you do not have the right
            to access;
          </li>
          <li>
            Attempt to interfere with, disrupt, or gain unauthorized access to
            the Service or other users&apos; data;
          </li>
          <li>
            Use the Service for any unlawful purpose, or to violate the terms of
            Shopify, WordPress, or any third-party platform;
          </li>
          <li>
            Reverse-engineer, resell, or misuse the Service outside its intended
            purpose.
          </li>
        </ul>
        <p className="mt-3">
          We may suspend or terminate access for violations of these Terms.
        </p>
      </>
    ),
  },
  {
    title: "7. Intellectual Property",
    body: (
      <p>
        The Service, including its software, design, and content (excluding your
        own store data), is owned by us or our licensors and is protected by
        intellectual property laws. You retain all rights to your own store
        content; we claim no ownership over it and use it solely to generate
        your requested export.
      </p>
    ),
  },
  {
    title: "8. Disclaimers",
    body: (
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available,&rdquo; without warranties of any kind, express or implied,
        including warranties of merchantability, fitness for a particular
        purpose, or non-infringement. We do not guarantee that exported files
        will be error-free, that they will import perfectly into every
        configuration of every target platform, or that migration will preserve
        search engine rankings, formatting, or functionality identically to your
        original store.
      </p>
    ),
  },
  {
    title: "9. Limitation of Liability",
    body: (
      <p>
        To the fullest extent permitted by law, we will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or
        any loss of data, revenue, profits, or business opportunities, arising
        from your use of the Service. Our total liability for any claim relating
        to the Service will not exceed the amount you paid us in the 3 months
        preceding the claim.
      </p>
    ),
  },
  {
    title: "10. Indemnification",
    body: (
      <p>
        You agree to indemnify and hold us harmless from any claims, damages, or
        expenses (including reasonable legal fees) arising from your use of the
        Service, your violation of these Terms, or your violation of any rights
        of a third party (including your own customers).
      </p>
    ),
  },
  {
    title: "11. Changes to the Service or Terms",
    body: (
      <p>
        We may modify or discontinue the Service, or update these Terms, at any
        time. Continued use of the Service after changes take effect constitutes
        acceptance of the updated Terms. Material changes will be reflected by
        updating the &ldquo;Last updated&rdquo; date above.
      </p>
    ),
  },
  {
    title: "12. Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of India, without regard to
        conflict of law principles. Any disputes arising from these Terms or the
        Service will be subject to the exclusive jurisdiction of the courts of
        India.
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <>
      <Header nav={false} />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: July 26, 2026
        </p>

        <p className="mt-6 text-slate-600">
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
          migrationmaster.online (the &ldquo;Service&rdquo;), operated by an
          individual (sole proprietor) based in India (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; &ldquo;our&rdquo;). By using the Service, you agree
          to these Terms. If you do not agree, do not use the Service.
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
              13. Contact
            </h2>
            <p className="mt-2 text-slate-600">
              Questions about these Terms can be sent to:
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
