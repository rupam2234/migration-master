"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface CreditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredCredits: number;
  purchaseMode?: "export" | "wallet";
  onPaymentCancelled?: () => void;
  onPaymentSuccess?: (transactionId?: string) => void | Promise<void>;
}

const PRICING_TIERS = [
  { min: 1, max: 500, rate: 0.15 },
  { min: 501, max: 5_000, rate: 0.1 },
  { min: 5_001, max: Number.POSITIVE_INFINITY, rate: 0.05 },
] as const;

function calculatePrice(credits: number): { price: number; currency: "USD" } {
  const safeCredits = Math.max(1, Math.floor(credits || 1));
  const tier =
    PRICING_TIERS.find(
      ({ min, max }) => safeCredits >= min && safeCredits <= max,
    ) ?? PRICING_TIERS[PRICING_TIERS.length - 1];

  return { price: safeCredits * tier.rate, currency: "USD" };
}

// Generate exactly 3 DISTINCT, ascending smart credit options:
// 1st = exact required, 2nd = next rounded number, 3rd = next tier limit.
function generateSmartOptions(
  requiredCredits: number,
): [number, number, number] {
  const required = Math.max(1, Math.floor(requiredCredits || 1));

  // Option 2: next rounded step above required (never equal to required)
  const roundStep =
    required < 50
      ? 10
      : required < 500
        ? 50
        : required < 1000
          ? 100
          : required < 5000
            ? 500
            : 1000;
  const rounded = Math.floor(required / roundStep) * roundStep + roundStep;

  // Option 3: use the next actual tier boundary. Once the open-ended
  // 5,001+ tier is reached, use another rounded amount instead of inventing
  // an upper limit that does not exist in the pricing rules.
  const nextTierBoundary = PRICING_TIERS.find(
    ({ max }) => Number.isFinite(max) && max > rounded,
  )?.max;
  const thirdOption = nextTierBoundary ?? rounded + roundStep;

  const unique = Array.from(new Set([required, rounded, thirdOption])).sort(
    (a, b) => a - b,
  );
  while (unique.length < 3) {
    unique.push(unique[unique.length - 1] + roundStep);
  }
  return [unique[0], unique[1], unique[2]];
}

export function CreditPurchaseModal({
  open,
  onOpenChange,
  requiredCredits,
  purchaseMode = "export",
  onPaymentCancelled,
  onPaymentSuccess,
}: CreditPurchaseModalProps) {
  const required = Math.max(1, Math.floor(requiredCredits || 1));
  type PaymentMethodId = "razorpay";
  const [selectedCredits, setSelectedCredits] = useState(
    purchaseMode === "wallet" ? 100 : required,
  );
  const [loading, setLoading] = useState(false);
  const [paymentStage, setPaymentStage] = useState<
    "idle" | "preparing" | "checkout" | "verifying" | "adding"
  >("idle");
  const [couponLoading, setCouponLoading] = useState(false);
  const paymentMethod: PaymentMethodId = "razorpay";
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponQuote, setCouponQuote] = useState<{
    code: string;
    discountPercent: number;
    discountUsd: number;
    originalInr: number;
    discountInr: number;
    totalUsd: number;
    totalInr: number;
    isFree: boolean;
  } | null>(null);

  const smartOptions = useMemo(
    () => generateSmartOptions(required),
    [required],
  );
  const priceInfo = calculatePrice(selectedCredits);
  const displayedTotal = couponQuote
    ? couponQuote.totalInr / 100
    : priceInfo.price;
  const displayedOriginalTotal = couponQuote
    ? couponQuote.originalInr / 100
    : priceInfo.price;
  const displayedDiscount = couponQuote ? couponQuote.discountInr / 100 : 0;
  const displayCurrency = couponQuote ? "₹" : "$";

  useEffect(() => {
    if (open) {
      setSelectedCredits(purchaseMode === "wallet" ? 100 : required);
      setPurchaseError(null);
      setLoading(false);
      setPaymentStage("idle");
      setCouponCode("");
      setCouponQuote(null);
    }
  }, [open, purchaseMode, required]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setPurchaseError(null);
    try {
      const response = await fetch("/api/credits/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, credits: selectedCredits }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success)
        throw new Error(data?.error || "Invalid discount code");
      setCouponQuote(data.quote);
    } catch (error) {
      setCouponQuote(null);
      setPurchaseError(
        error instanceof Error ? error.message : "Invalid discount code",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  async function handlePurchase() {
    setLoading(true);
    setPaymentStage("preparing");
    setPurchaseError(null);

    try {
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
      if (!razorpayKey)
        throw new Error("Razorpay public key is not configured.");
      if (
        typeof window === "undefined" ||
        !(
          window as typeof window & {
            Razorpay?: new (options: Record<string, unknown>) => {
              open: () => void;
            };
          }
        ).Razorpay
      ) {
        throw new Error(
          "Razorpay Checkout is still loading. Please try again.",
        );
      }

      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditsRequested: selectedCredits,
          couponCode: couponQuote?.code,
          paymentMethodId: paymentMethod,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || `Unable to create payment order (${response.status})`,
        );
      }

      if (data.isFree) {
        setPaymentStage("adding");
        setLoading(true);
        await onPaymentSuccess?.(data.transactionId);
        setLoading(false);
        setPaymentStage("idle");
        onOpenChange(false);
        return;
      }

      if (!data.paymentOrderId) {
        throw new Error("Payment order was not created");
      }

      const checkoutCurrency = "INR";
      const checkoutAmount = data.amountInr;
      const RazorpayConstructor = (
        window as typeof window & {
          Razorpay: new (options: Record<string, unknown>) => {
            open: () => void;
          };
        }
      ).Razorpay;

      const checkout = new RazorpayConstructor({
        key: razorpayKey,
        amount: checkoutAmount,
        currency: checkoutCurrency,
        name: "Migration Master",
        description: `Purchase ${data.creditsRequested} credits`,
        order_id: data.paymentOrderId,
        handler: async (payment: Record<string, string>) => {
          try {
            setPaymentStage("verifying");
            setLoading(true);
            const verifyResponse = await fetch("/api/credits/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transactionId: data.transactionId,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });
            const verification = await verifyResponse.json().catch(() => null);

            if (!verifyResponse.ok || !verification?.success) {
              throw new Error(
                verification?.error || "Payment verification failed.",
              );
            }

            setPaymentStage("adding");
            await onPaymentSuccess?.(data.transactionId);
            setPaymentStage("idle");
            onOpenChange(false);
          } catch (error) {
            setPurchaseError(
              error instanceof Error
                ? error.message
                : "Payment verification failed.",
            );
          } finally {
            setLoading(false);
            setPaymentStage("idle");
          }
        },
        method: { netbanking: false },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setPurchaseError(
              purchaseMode === "wallet"
                ? "Payment cancelled. No credits were added to your account."
                : "Payment cancelled. Export processing was stopped.",
            );
            onPaymentCancelled?.();
          },
        },
      });

      setPaymentStage("checkout");
      checkout.open();
    } catch (error) {
      setPurchaseError(
        error instanceof Error ? error.message : "Unable to start payment.",
      );
      setLoading(false);
    }
  }

  const paymentStatusText = {
    idle: null,
    preparing: "Preparing your secure purchase…",
    checkout: "Complete payment in the Razorpay window.",
    verifying: "Verifying your payment…",
    adding: "Adding credits to your account…",
  }[paymentStage];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-purchase-title"
      onMouseDown={() => {
        if (!loading) onOpenChange(false);
      }}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
          <div>
            <h2
              id="credit-purchase-title"
              className="flex items-center gap-2 text-lg font-semibold text-gray-900"
            >
              <CreditCard className="h-5 w-5 text-blue-600" />
              Purchase credits
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {purchaseMode === "wallet"
                ? "Add credits to your account for future migrations."
                : `${required} ${required === 1 ? "credit is" : "credits are"} required for this export.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close credit purchase dialog"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        {
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] md:gap-7">
            <section aria-labelledby="credit-options-title">
              <h3
                id="credit-options-title"
                className="mb-3 text-sm font-semibold text-gray-900"
              >
                {purchaseMode === "wallet"
                  ? "Choose an amount"
                  : "Choose an amount"}
              </h3>
              {purchaseMode === "wallet" ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                      <Zap className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-blue-950">
                        Flexible credit purchase
                      </div>
                      <p className="text-xs text-blue-700">
                        Select the amount that fits your migration.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-blue-950">
                      Credits to add
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        step={1}
                        value={selectedCredits}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setSelectedCredits(
                            Math.min(10000, Math.max(1, Number.isFinite(next) ? next : 1)),
                          );
                        }}
                        className="w-24 rounded-lg border border-blue-200 bg-white px-2 py-1 text-right text-lg font-bold tabular-nums text-blue-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        aria-label="Number of credits to purchase"
                      />
                      <span className="text-sm text-blue-800">credits</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10000}
                    step={1}
                    value={selectedCredits}
                    onChange={(event) =>
                      setSelectedCredits(Number(event.target.value))
                    }
                    className="mt-4 h-2 w-full cursor-pointer accent-blue-600"
                    aria-label="Credit amount"
                  />
                  <div className="mt-2 flex justify-between text-[11px] text-blue-700/70">
                    <span>1 credit</span>
                    <span>10,000 credits</span>
                  </div>
                  {/* <div className="mt-5 flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3">
                    <span className="text-sm text-blue-800">Price</span>
                    <span className="text-lg font-semibold text-blue-950">
                      ${priceInfo.price.toFixed(2)}
                    </span>
                  </div> */}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {smartOptions.map((credits, index) => {
                      const option = calculatePrice(credits);
                      const selected = selectedCredits === credits;
                      const label =
                        index === 0
                          ? "Exact amount"
                          : index === 1
                            ? "Recommended"
                            : "Best value";

                      return (
                        <button
                          key={credits}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedCredits(credits)}
                          className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                            selected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Zap
                              className={`h-5 w-5 ${selected ? "text-blue-600" : "text-gray-400"}`}
                              aria-hidden="true"
                            />
                            <span>
                              <span className="block font-semibold text-gray-900">
                                {credits.toLocaleString()} credits
                              </span>
                              <span className="text-xs text-gray-500">
                                {label}
                              </span>
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block font-semibold text-gray-900">
                              ${option.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ${(option.price / credits).toFixed(2)}/credit
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                    $0.15/credit up to 500 · $0.10/credit for 501–5,000 ·
                    $0.05/credit above 5,000.
                  </p>
                </>
              )}
            </section>

            <section
              className="flex flex-col"
              aria-labelledby="payment-details-title"
            >
              <h3
                id="payment-details-title"
                className="mb-3 text-sm font-semibold text-gray-900"
              >
                Payment details
              </h3>
              <div className="overflow-hidden rounded-2xl border border-slate-800/20 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-4 text-white shadow-[0_12px_30px_-18px_rgba(30,64,175,0.65)] sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                      <ShieldCheck
                        className="h-4 w-4 text-blue-300"
                        aria-hidden="true"
                      />
                      Secure checkout
                    </div>
                    <p className="text-xs leading-relaxed text-blue-100/75">
                      Payment details are processed securely by Razorpay.
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 p-2 text-blue-100">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <div className="rounded-xl border border-white/80 bg-white p-3 text-left text-slate-950 shadow-lg shadow-slate-950/25">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-900">
                      Razorpay
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      Available
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">UPI and cards</p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-100/65">
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  Your payment details are never stored by Migration Master.
                </div>
              </div>

              <div className="mt-4 min-w-0 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-600">Credits</span>
                  <span className="font-medium text-gray-900">
                    {selectedCredits.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-600">Price per credit</span>
                  <span className="font-medium text-gray-900">
                    ${(priceInfo.price / selectedCredits).toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="font-semibold text-gray-900">
                    {couponQuote ? "Amount due" : "Total"}
                  </span>
                  <span className="text-right">
                    {couponQuote && (
                      <span className="block text-xs text-gray-400 line-through">
                        {displayCurrency}
                        {displayedOriginalTotal.toFixed(2)}
                      </span>
                    )}
                    <span className="block text-xl font-semibold text-gray-900">
                      {displayCurrency}
                      {displayedTotal.toFixed(2)}
                    </span>
                    {couponQuote && displayedDiscount > 0 && (
                      <span className="block text-xs font-medium text-emerald-600">
                        You save {displayCurrency}
                        {displayedDiscount.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
               {paymentStatusText && (
                 <div
                   role="status"
                   aria-live="polite"
                   className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800"
                 >
                   <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                   {paymentStatusText}
                 </div>
               )}

               {purchaseError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {purchaseError}
                </div>
              )}

              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <label
                  htmlFor="credit-coupon-code"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Discount code
                </label>
                <div className="flex min-w-0 gap-2">
                  <input
                    id="credit-coupon-code"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      setCouponQuote(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void applyCoupon();
                      }
                    }}
                    placeholder="Enter code"
                    maxLength={64}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase tracking-wide outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    aria-describedby="coupon-status"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => void applyCoupon()}
                    disabled={loading || couponLoading || !couponCode.trim()}
                  >
                    {couponLoading ? "Applying…" : "Apply"}
                  </Button>
                </div>
                <div
                  id="coupon-status"
                  aria-live="polite"
                  className="mt-2 min-h-4 text-xs"
                >
                  {couponQuote ? (
                    <span className="font-medium text-emerald-700">
                      {couponQuote.code} applied: {couponQuote.discountPercent}%
                      off % off
                      {couponQuote.isFree ? " (free test)" : ""}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Discount eligibility and pricing are securely verified at
                      checkout.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-auto flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handlePurchase}
                  disabled={loading}
                >
                  {loading ? "Creating order…" : "Continue with Razorpay"}
                </Button>
              </div>
            </section>
          </div>
        }
      </div>
    </div>
  );
}
