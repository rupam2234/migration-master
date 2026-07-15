"use client";

import { useState } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";

export default function AddSite() {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");

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
      setError("Please enter a valid Shopify domain.");
      return;
    }

    window.location.href = `/api/shopify/connect?shop=${encodeURIComponent(shop)}`;
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-primary/80">
          <ShoppingBag className="h-[18px] w-[18px] text-primary-foreground" />
        </div>

        <div>
          <p className="text-sm font-medium">Connect a Shopify store</p>
          <p className="text-sm text-gray-500">
            Enter your Shopify store domain to connect securely
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <label
            htmlFor="shopDomain"
            className="mb-1.5 block text-sm text-primary/80"
          >
            Shopify store domain
          </label>

          <input
            id="shopDomain"
            type="text"
            placeholder="your-store.myshopify.com"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            className="w-full rounded-sm px-3 py-2 text-sm text-primary-foreground bg-primary/80 outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={connectShopify}
          className="flex items-center justify-center gap-2 rounded-sm bg-primary/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <span>Connect Shopify</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 mt-4 text-[13px] text-primary">
        <p>
          <strong>Note</strong>: Shopify manages authentication securely.
          Although this process{" "}
          <strong>require installation of a plugin (which is automatic)</strong>{" "}
          as the connection establishes and essential in securely handle your
          shop authentication.
        </p>
        <p>Once the migration is complete, you can remove the app instantly.</p>
      </div>
    </div>
  );
}
