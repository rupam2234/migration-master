"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";

export default function AddSite() {
  const [step, setStep] = useState<"select" | "connect">("select");
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  function connectShopify() {
    setError("");

    let shop = shopDomain.trim();

    if (!shop) {
      setError("Please enter your Shopify store domain.");
      return;
    }

    // Normalize domain
    shop = shop
      .replace("https://", "")
      .replace("http://", "")
      .replace(/\/$/, "");

    if (!shop.endsWith(".myshopify.com")) {
      setError(
        "Please enter a valid Shopify domain (e.g. your-store.myshopify.com).",
      );
      return;
    }

    setIsConnecting(true);
    window.location.href = `/api/shopify/connect?shop=${encodeURIComponent(shop)}`;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {step === "select" ? (
        <>
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              Select Migration Type
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Choose the source and destination platforms for your new project.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Card 1: Shopify to WordPress (Active) */}
            <div
              onClick={() => setStep("connect")}
              className="group relative flex flex-col justify-between rounded-sm border border-gray-200 bg-white p-6 shadow-xs transition-all duration-200 hover:border-gray-900 hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 p-1.5 border border-emerald-100">
                      <Image
                        src="/images/shopify-logo.png"
                        alt="Shopify"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 p-1.5 border border-blue-100">
                      <Image
                        src="/images/wordpress-logo.png"
                        alt="WordPress"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Available
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-black">
                    Shopify to WordPress
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Export your products, orders, customers, pages, blogs, and
                    media from Shopify into WordPress WXR import files.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-medium text-gray-900">
                <span>Configure connection</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Card 2: WordPress to Shopify (Disabled) */}
            <div className="relative flex flex-col justify-between rounded-sm border border-gray-200 bg-gray-50/70 p-6 opacity-60 cursor-not-allowed select-none">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 p-1.5 border border-blue-100">
                      <Image
                        src="/images/wordpress-logo.png"
                        alt="WordPress"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 p-1.5 border border-emerald-100">
                      <Image
                        src="/images/shopify-logo.png"
                        alt="Shopify"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                    <Lock className="h-3 w-3 text-amber-500" />
                    Coming Soon
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-semibold text-gray-700">
                    WordPress to Shopify
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Import content and catalog data from WordPress or
                    WooCommerce directly into your Shopify store catalog.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-200/60 pt-4 text-xs font-medium text-gray-400">
                <span>Not available yet</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Step 2: Shopify Connection Form */
        <div className="max-w-xl space-y-5">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setStep("select")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to migration types
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-900 text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Connect a Shopify Store
              </h2>
              <p className="text-xs text-gray-500">
                Enter your Shopify store domain to connect securely via OAuth
              </p>
            </div>
          </div>

          <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div>
              <label
                htmlFor="shopDomain"
                className="mb-1.5 block text-xs font-medium text-gray-700"
              >
                Shopify Store Domain
              </label>

              <input
                id="shopDomain"
                type="text"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") connectShopify();
                }}
                disabled={isConnecting}
                className="w-full rounded-sm bg-primary/80 px-3 py-2 text-sm text-primary-foreground outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-600">{error}</p>
            )}

            <button
              type="button"
              onClick={connectShopify}
              disabled={isConnecting}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              <span>
                {isConnecting
                  ? "Redirecting to Shopify..."
                  : "Connect Shopify Store"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 rounded-sm bg-primary/5 p-4 text-[13px] leading-relaxed text-gray-600 border border-gray-100">
            <p>
              <strong className="text-gray-900">Secure Authentication:</strong>{" "}
              Shopify handles authentication securely via official OAuth.
              Connection automatically installs the Migration Master app to
              grant API read access to your catalog.
            </p>
            <p>
              You can disconnect or delete the app anytime after your export is
              completed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
