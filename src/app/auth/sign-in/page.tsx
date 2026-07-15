"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage({ text: "Email and password are required.", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/db/user/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          text: data.message || "Invalid email or password.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      setMessage({ text: "Signed in. Redirecting...", type: "success" });
      setLoading(false);
      router.push("/dashboard");
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full my-16 max-w-[420px]">
      <div className="mb-7 flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
          <ShoppingBag className="h-[18px] w-[18px] text-gray-500" />
        </div>
        <div className="text-center">
          <p className="mb-1 text-lg font-medium">Welcome back</p>
          <p className="text-sm text-gray-500">
            Sign in to continue your migration
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-gray-500">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="jordan@store.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm text-gray-500">
              Password
            </label>
            <button
              type="button"
              onClick={() => sendPromptForgotPassword()}
              className="text-xs text-gray-400 transition hover:text-gray-600"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-default disabled:opacity-70"
        >
          <span>{loading ? "Signing in" : "Sign in"}</span>
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        <p
          className={`min-h-[18px] text-center text-sm ${
            message?.type === "error" ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {message?.text || ""}
        </p>
      </form>

      <p className="text-center text-xs text-gray-400">
        Don&apos;t have an account?{" "}
        <a
          href="/auth/sign-up"
          className="font-medium text-gray-700 hover:underline"
        >
          Create one
        </a>
      </p>
    </div>
  );
}

function sendPromptForgotPassword() {
  // placeholder action - wire up to a password reset flow
}
