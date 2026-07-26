import { Footer, Header } from "@/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Migration Master",
  description:
    "When refunds apply for Migration Master exports, and how to request one.",
};

export default function RefundPolicyPage() {
  return (
    <>
      <Header nav={false} />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Refund Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: July 26, 2026
        </p>

        <p className="mt-6 text-slate-600">
          We want you to feel confident before you pay for anything. That&apos;s
          why Migration Master shows you an itemized manifest — exactly what
          will be exported and what it will cost — before you&apos;re charged.
          This policy explains when refunds apply.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            1. Before You Pay
          </h2>
          <p className="mt-2 text-slate-600">
            You are never charged before reviewing your manifest. Take the time
            to check the item counts (products, orders, pages, blogs, images,
            categories) match what you expect before confirming payment.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            2. Eligible for a Refund
          </h2>
          <p className="mt-2 text-slate-600">
            We will provide a full or partial refund if:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-600">
            <li>
              The export file we generate does not match the confirmed manifest
              (e.g., missing item types you paid for, or a materially incorrect
              item count due to an error on our end);
            </li>
            <li>
              The export file is corrupted or fails to open/import due to a
              technical fault on our side, and we&apos;re unable to fix it
              within a reasonable time;
            </li>
            <li>
              You were charged in error or charged twice for the same export.
            </li>
          </ul>
          <p className="mt-3 text-slate-600">
            To request a refund, email{" "}
            <a
              href="mailto:support@migrationmaster.online"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-[#a23b2e]"
            >
              support@migrationmaster.online
            </a>{" "}
            within 14 days of your export, including your export/order number
            and a description of the issue.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            3. Not Eligible for a Refund
          </h2>
          <p className="mt-2 text-slate-600">
            Refunds generally do not apply when:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-600">
            <li>
              The manifest was accurate and the export was delivered as
              described, but the files did not import as expected due to issues
              with your hosting provider, WordPress configuration, plugin
              conflicts, or platform-specific limits outside our control;
            </li>
            <li>
              You simply change your mind after confirming and paying for the
              manifest;
            </li>
            <li>
              The issue relates to formatting or design choices unique to your
              store theme that are not part of the exported data itself (e.g.,
              custom theme styling that WXR import does not carry over).
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            4. How Refunds Are Processed
          </h2>
          <p className="mt-2 text-slate-600">
            Approved refunds are issued to your original payment method,
            typically within 5–10 business days, depending on your payment
            provider.
          </p>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-semibold text-slate-900">5. Contact</h2>
          <p className="mt-2 text-slate-600">
            For any billing or refund questions:
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
      </main>
      <Footer />
    </>
  );
}
