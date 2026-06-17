"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShoppingBag } from "lucide-react";
import Link from "next/link";

const STRENGTH_COLORS = ["bg-red-500", "bg-amber-500", "bg-emerald-500"];
const STRENGTH_LABELS = ["Weak", "Okay", "Strong"];

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!name.trim() || !email.trim() || !password) {
      setMessage({ text: "All fields are required.", type: "error" });
      return;
    }
    if (password.length < 8) {
      setMessage({
        text: "Password must be at least 8 characters.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/db/user/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
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

      setMessage({ text: "Account created. Redirecting...", type: "success" });
      setTimeout(() => router.push("/auth/sign-in"), 800);
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full my-16  max-w-[420px]">
      <div className="relative flex items-center justify-center">
        <div className="z-10 flex flex-col items-center gap-1.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
            <ShoppingBag className="h-[18px] w-[18px] text-gray-500" />
          </div>
          <span className="text-[11px] text-gray-400">Shopify</span>
        </div>

        <div className="relative mx-3 mb-[18px] h-px flex-1 bg-gray-200">
          <TransferDot />
        </div>

        <div className="z-10 flex flex-col items-center gap-1.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
            <span className="text-[18px] font-semibold text-gray-500">W</span>
          </div>
          <span className="text-[11px] text-gray-400">WordPress</span>
        </div>
      </div>

      <div className="mb-7 text-center">
        <p className="mb-1 text-lg font-medium">Create your account</p>
        <p className="text-sm text-gray-500">
          Move your store without losing a thing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm text-gray-500">
            Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Jordan Reyes"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />
        </div>

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
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm text-gray-500"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              required
              minLength={8}
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

          <div className="mt-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                  i < strength ? STRENGTH_COLORS[strength - 1] : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p
            className={`mt-1.5 min-h-[14px] text-xs ${
              password.length === 0
                ? "text-gray-400"
                : strength === 1
                  ? "text-red-500"
                  : strength === 2
                    ? "text-amber-500"
                    : "text-emerald-500"
            }`}
          >
            {password.length > 0 ? STRENGTH_LABELS[strength - 1] : ""}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-default disabled:opacity-70"
        >
          <span>{loading ? "Creating account" : "Create account"}</span>
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
        By continuing you agree to keep your shop access token encrypted at
        rest.
      </p>

      <p className="text-xs text-center text-primary/60">
        Already have an account?{" "}
        <Link
          className="hover:underline font-medium text-primary"
          href={"/auth/sign-in"}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function getPasswordStrength(password: string) {
  if (password.length === 0) return 0;
  if (
    password.length >= 10 &&
    /[0-9]/.test(password) &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  ) {
    return 3;
  }
  if (
    password.length >= 8 &&
    /[0-9]/.test(password) &&
    /[a-zA-Z]/.test(password)
  ) {
    return 2;
  }
  if (password.length >= 8) return 1;
  return 0;
}

function TransferDot() {
  const [pos, setPos] = useState(0);
  const dirRef = useRef(1);

  useEffect(() => {
    const id = setInterval(() => {
      setPos((p) => {
        const next = p + dirRef.current * 0.6;
        if (next >= 100) dirRef.current = -1;
        if (next <= 0) dirRef.current = 1;
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-gray-400"
      style={{
        left: `${pos}%`,
        opacity: 0.4 + 0.6 * Math.sin((pos / 100) * Math.PI),
      }}
    />
  );
}
