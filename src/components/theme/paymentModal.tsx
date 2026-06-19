"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { PRICE_PER_ITEM } from "@/app/api/stripe/default-price";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type PaymentModalProps = {
  open: boolean;
  price: { itemCount: number; total: number; formatted: string };
  onSuccess: () => void;
  onClose: () => void;
};

type CheckoutFormProps = {
  price: { formatted: string; itemCount: number };
  onSuccess: () => void;
  onCancel: () => void;
};

export function PaymentModal({
  open,
  price,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    fetch("/api/stripe/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(price.total * 100),
      }),
    })
      .then((r) => r.json())
      .then((d) => setClientSecret(d.clientSecret));
  }, [open, price.itemCount]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          Confirm Export
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {price.itemCount} record{price.itemCount !== 1 ? "s" : ""} ·{" "}
          {price.formatted}
        </p>

        {!clientSecret ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Loading payment...
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              price={price}
              onSuccess={() => {
                onClose();
                onSuccess();
              }}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

function CheckoutForm({ price, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "valid" | "invalid" | "checking"
  >("idle");

  const originalAmount = price.itemCount * PRICE_PER_ITEM;
  const discountAmount = originalAmount * (discount / 100);
  const finalAmount = originalAmount - discountAmount;
  const finalFormatted = `$${finalAmount.toFixed(2)}`;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponStatus("checking");

    const res = await fetch("/api/stripe/validate-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon }),
    });

    const data = await res.json();

    if (res.ok && data.discount) {
      setDiscount(data.discount);
      setCouponStatus("valid");
    } else {
      setDiscount(0);
      setCouponStatus("invalid");
    }
  };

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          billing_details: {
            phone: "",
          },
        },
      },
    });

    if (error) {
      setError(error.message ?? "Payment failed");
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Coupon code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={coupon}
            onChange={(e) => {
              setCoupon(e.target.value.toUpperCase());
              setCouponStatus("idle");
              setDiscount(0);
            }}
            onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
            placeholder="SAVE20"
            className="flex-1 rounded-sm border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={applyCoupon}
            disabled={couponStatus === "checking" || !coupon.trim()}
            className="rounded-sm text-sm px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-50"
          >
            {couponStatus === "checking" ? "..." : "Apply"}
          </button>
        </div>

        {couponStatus === "valid" && (
          <p className="mt-1 text-xs text-green-600">
            ✓ {discount}% discount applied
          </p>
        )}
        {couponStatus === "invalid" && (
          <p className="mt-1 text-xs text-red-500">Invalid or expired coupon</p>
        )}
      </div>

      {discount > 0 && (
        <div className="rounded-md bg-green-50 border border-green-100 p-3 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Original</span>
            <span className="line-through">{price.formatted}</span>
          </div>
          <div className="flex justify-between text-xs text-green-600">
            <span>Discount ({discount}%)</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-800 pt-1 border-t border-green-200">
            <span>Total</span>
            <span>{finalFormatted}</span>
          </div>
        </div>
      )}

      <PaymentElement
        options={{
          wallets: { link: "never", googlePay: "auto" },
          fields: {
            billingDetails: {
              name: "auto",
              email: "auto",
              phone: "never",
            },
          },
        }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-sm text-sm px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600"
          onClick={onCancel}
          disabled={paying}
        >
          Cancel
        </button>
        <button
          className="flex-1 rounded-sm text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          onClick={handlePay}
          disabled={paying || !stripe}
        >
          {paying
            ? "Processing..."
            : `Pay ${discount > 0 ? finalFormatted : price.formatted}`}
        </button>
      </div>
    </div>
  );
}
