import { ContactForm, Footer, Header } from "@/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Migration Master",
  description:
    "Get in touch with Migration Master for support with your Shopify to WordPress or WordPress to Shopify migration.",
};

export default function ContactPage() {
  return (
    <>
      <Header nav={false} />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Contact us
        </h1>
        <p className="mt-3 text-slate-600">
          Have a question about migrating your store, need help with an export,
          or want to report an issue? Fill out the form below and we&apos;ll get
          back to you within 1–2 business days.
        </p>

        <section className="mt-10 rounded-lg border border-slate-200 p-6 relative">
          <ContactForm />
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            Before you reach out
          </h2>
          <p className="mt-2 text-slate-600">
            For faster help, please include:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-600">
            <li>The email address associated with your account</li>
            <li>
              Your export/order number (e.g. &ldquo;Export · No. 00417&rdquo;)
            </li>
            <li>The platforms involved (e.g. Shopify → WordPress)</li>
            <li>
              A brief description of the issue, including any error messages
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            What we can help with
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-600">
            <li>Questions before you start a migration</li>
            <li>Issues with a connected store or authentication</li>
            <li>
              Problems with an exported file (missing items, import errors)
            </li>
            <li>Billing and refund questions</li>
            <li>General feedback or feature requests</li>
          </ul>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Business information
          </h2>
          <p className="mt-2 text-slate-600">
            Migration Master is operated by an individual (sole proprietor)
            based in India.
          </p>
          <p className="mt-1 text-slate-600">
            Prefer email? Reach us directly at{" "}
            <a
              href="mailto:support@migrationmaster.online"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-[#a23b2e]"
            >
              support@migrationmaster.online
            </a>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
