"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type ConnectorInfo = {
  projectName: string;
  token: string;
  appUrl: string;
  downloadUrl: string;
};

export default function AddSite() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "connect" | "preset">("select");
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState("WordPress");
  const [destinationPlatform, setDestinationPlatform] = useState("Shopify");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [destinationIdentifier, setDestinationIdentifier] = useState("");
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [connectorInfo, setConnectorInfo] = useState<ConnectorInfo | null>(
    null,
  );
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

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

  function openPresetProject() {
    setError("");
    setConnectorInfo(null);
    setCopyState("idle");
    setStep("preset");
    setSourcePlatform("WordPress");
    setDestinationPlatform("Shopify");
    setSourceIdentifier("");
    setDestinationIdentifier("");
  }

  async function createPresetProject() {
    setError("");
    setConnectorInfo(null);
    setCopyState("idle");

    const trimmedSourceIdentifier = sourceIdentifier.trim();
    const trimmedDestinationIdentifier = destinationIdentifier.trim();
    const projectName = normalizeHostname(trimmedSourceIdentifier);

    if (!projectName || !trimmedDestinationIdentifier) {
      setError("Please fill out the source and destination fields.");
      return;
    }

    setIsCreatingPreset(true);

    try {
      const res = await fetch("/api/db/wp-settings/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_name: projectName,
          source_platform: sourcePlatform,
          destination_platform: destinationPlatform,
          source_address: trimmedSourceIdentifier,
          destination_address: trimmedDestinationIdentifier,
          source_status: "PENDING",
          destination_status: "PENDING",
          settings: {},
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to create migration project");
      }

      const data = await res.json().catch(() => null);
      const connectorToken: string | undefined = data?.connector?.token;

      if (connectorToken) {
        setConnectorInfo({
          projectName,
          token: connectorToken,
          appUrl: window.location.origin,
          downloadUrl:
            data?.connector?.downloadUrl ??
            `/api/wordpress-connector/download?token=${encodeURIComponent(
              connectorToken,
            )}&appUrl=${encodeURIComponent(window.location.origin)}&projectName=${encodeURIComponent(
              projectName,
            )}`,
        });
        setIsCreatingPreset(false);
        return;
      }

      router.push(`/dashboard/${encodeURIComponent(projectName)}/wp-to-shopify`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to create migration project");
    } finally {
      setIsCreatingPreset(false);
    }
  }

  if (connectorInfo) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Connector Ready
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Download the WordPress source connector, upload it to WordPress,
            and connect the source site back to this project.
          </p>
        </div>

        <div className="rounded-sm border border-emerald-200 bg-emerald-50/60 p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-emerald-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-500">
                Project
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 break-all">
                {connectorInfo.projectName}
              </p>
            </div>

            <div className="rounded-sm border border-emerald-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-500">
                Download
              </p>
              <a
                href={connectorInfo.downloadUrl}
                download
                className="mt-2 inline-flex rounded-sm bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Download plugin zip
              </a>
            </div>
          </div>

          <div className="rounded-sm border border-emerald-200 bg-white p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-500">
              Connector Token
            </p>
            <p className="mt-2 rounded-sm bg-gray-900 px-3 py-2 font-mono text-xs text-white break-all">
              {connectorInfo.token}
            </p>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-gray-700">
            <p>
              1. Download the plugin zip and upload it in WordPress under
              Plugins {">"} Add New {">"} Upload Plugin.
            </p>
            <p>
              2. In WordPress, open Settings {">"} Migration Master Connector,
              paste the token, and connect to <code>{connectorInfo.appUrl}</code>.
            </p>
            <p>
              3. Once connected, the app will mark the project as linked in
              <code>migration_connections</code> and the export endpoints will be available.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={connectorInfo.downloadUrl}
              download
              className="rounded-sm border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              Download plugin zip
            </a>

            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(connectorInfo.token);
                setCopyState("copied");
                window.setTimeout(() => setCopyState("idle"), 1500);
              }}
              className="rounded-sm border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              {copyState === "copied" ? "Copied token" : "Copy token"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/${encodeURIComponent(connectorInfo.projectName)}/wp-to-shopify`,
                )
              }
              className="rounded-sm bg-primary/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary"
            >
              Open dashboard
            </button>
          </div>
        </div>
      </div>
    );
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

            {/* Card 2: WordPress to Shopify */}
            <div
              onClick={openPresetProject}
              className="group relative flex flex-col justify-between rounded-sm border border-gray-200 bg-white p-6 shadow-xs transition-all duration-200 hover:border-gray-900 hover:shadow-md cursor-pointer"
            >
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

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Available
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-black">
                    WordPress to Shopify
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Import content and catalog data from WordPress or
                    WooCommerce directly into your Shopify store catalog.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-medium text-gray-900">
                <span>Configure connection</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </>
      ) : step === "preset" ? (
        <div className="max-w-xl space-y-5">
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
                Create a WordPress to Shopify Project
              </h2>
              <p className="text-xs text-gray-500">
                Save source and destination details into the new migration
                table.
              </p>
            </div>
          </div>

          <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-gray-200 bg-gray-50/80 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  From
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  WordPress
                </p>
              </div>

              <div className="rounded-sm border border-gray-200 bg-gray-50/80 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  To
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  Shopify
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="sourceIdentifier"
                className="mb-1.5 block text-xs font-medium text-gray-700"
              >
                WordPress Site Address
              </label>

              <input
                id="sourceIdentifier"
                type="text"
                placeholder="https://source-site.com"
                value={sourceIdentifier}
                onChange={(e) => setSourceIdentifier(e.target.value)}
                className="w-full rounded-sm bg-primary/80 px-3 py-2 text-sm text-primary-foreground outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="destinationIdentifier"
                className="mb-1.5 block text-xs font-medium text-gray-700"
              >
                Shopify Store Address
              </label>

              <input
                id="destinationIdentifier"
                type="text"
                placeholder="my-store.myshopify.com"
                value={destinationIdentifier}
                onChange={(e) => setDestinationIdentifier(e.target.value)}
                className="w-full rounded-sm bg-primary/80 px-3 py-2 text-sm text-primary-foreground outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-600">{error}</p>
            )}

            <button
              type="button"
              onClick={createPresetProject}
              disabled={isCreatingPreset}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              <span>
                {isCreatingPreset
                  ? "Saving project..."
                  : "Create migration project"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
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

function normalizeHostname(value: string) {
  if (!value) return "";

  try {
    const normalized = value.match(/^https?:\/\//i)
      ? new URL(value)
      : new URL(`https://${value}`);
    return normalized.hostname.replace(/\/$/, "");
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}
