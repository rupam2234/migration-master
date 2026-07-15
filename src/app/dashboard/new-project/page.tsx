"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProjectContext } from "@/context";
import { ArrowRight, LightbulbIcon, ShoppingBag } from "lucide-react";

type Message = { text: string; type: "error" | "success" };

export default function AddSite() {
  const router = useRouter();
  const { setAllProjects, setActiveProject, allProjects } = useProjectContext();

  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const domain = shopDomain.trim();
    const token = accessToken.trim();

    if (!domain || !token) {
      setMessage({ text: "Both fields are required.", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/db/shop/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain: domain, accessToken: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          text: data.message || "Something went wrong.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      setAllProjects([...(allProjects ?? []), domain]);
      setActiveProject(domain);
      setMessage({ text: "Store connected. Redirecting...", type: "success" });
      setTimeout(
        () => router.push(`/dashboard/${encodeURIComponent(domain)}`),
        600,
      );
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
      setLoading(false);
    }
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
            Add your store domain and admin access token
          </p>
        </div>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            id="shopDomain"
            label="Store domain"
            type="text"
            placeholder="your-store.myshopify.com"
            value={shopDomain}
            onChange={setShopDomain}
          />

          <FormField
            id="accessToken"
            label="Admin API access token"
            type="password"
            placeholder="atkn_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={accessToken}
            onChange={setAccessToken}
          />

          <div className="flex items-center justify-between gap-4 pt-1">
            <p
              className={`text-sm ${
                message?.type === "error" ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {message?.text || ""}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="flex shrink-0 items-center justify-center gap-2 rounded-sm bg-primary/80 px-2 py-1 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-default disabled:opacity-70"
            >
              <span>{loading ? "Connecting" : "Connect store"}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 text-xs text-primary/80 flex items-center gap-1">
        <LightbulbIcon size={18} className="fill-orange-300" />
        <p>
          Your access token is encrypted before storage and never displayed
          again.
        </p>
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-primary/80">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm px-3 py-2 text-sm text-primary-foreground focus-visible:outline-none bg-primary/80 transition focus-visible:ring-0 outline-none"
      />
    </div>
  );
}
