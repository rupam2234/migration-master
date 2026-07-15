"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type PaymentModalProps = {
  open: boolean;
  price: { itemCount: number; total: number; formatted: string };
  onSuccess: (paymentIntentId?: string) => void;
  onClose: () => void;
};

type CheckoutWrapperProps = {
  price: { itemCount: number; total: number; formatted: string };
  onSuccess: (paymentIntentId?: string) => void;
  onCancel: () => void;
};

type CheckoutFormProps = {
  originalFormatted: string;
  serverAmount: number | null;
  couponStatus: "idle" | "valid" | "invalid" | "checking";
  onSuccess: (paymentIntentId?: string) => void;
  onCancel: () => void;
};

export function PaymentModal({
  open,
  price,
  onSuccess,
  onClose,
}: PaymentModalProps) {
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

        <CheckoutWrapper
          price={price}
          onSuccess={(paymentIntentId) => {
            // onClose();
            onSuccess(paymentIntentId);
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function CheckoutWrapper({ price, onSuccess, onCancel }: CheckoutWrapperProps) {
  const [coupon, setCoupon] = useState("");
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "valid" | "invalid" | "checking"
  >("idle");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [processing, setProcessing] = useState<boolean>(false);

  const fetchPaymentIntent = async (couponCode?: string) => {
    setClientSecret(null);
    try {
      const res = await fetch("/api/stripe/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCount: price.itemCount,
          coupon: couponCode,
          paymentIntentId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("create-payment failed:", res.status, text);
        return;
      }

      const data = await res.json();

      if (data.amount === 0) {
        setIsFree(true);
        setServerAmount(0);
        return;
      }

      setClientSecret(data.clientSecret);
      setServerAmount(data.amount);
      if (data.paymentIntentId) setPaymentIntentId(data.paymentIntentId);
    } catch (e) {
      console.error("fetchPaymentIntent error:", e);
    }
  };

  useEffect(() => {
    fetchPaymentIntent();
  }, [price.itemCount]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;

    setCouponStatus("checking");

    try {
      await fetchPaymentIntent(coupon);
      setCouponStatus("valid");
    } catch {
      setCouponStatus("invalid");
    }
  };

  const discountAmount =
    serverAmount !== null ? price.total - serverAmount / 100 : 0;

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
              setIsFree(false);
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
          <p className="mt-1 text-xs text-green-600">✓ Discount applied</p>
        )}
        {couponStatus === "invalid" && (
          <p className="mt-1 text-xs text-red-500">Invalid or expired coupon</p>
        )}
      </div>

      {couponStatus === "valid" && serverAmount !== null && (
        <div className="rounded-md bg-green-50 border border-green-100 p-3 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Original</span>
            <span className="line-through">{price.formatted}</span>
          </div>
          <div className="flex justify-between text-xs text-green-600">
            <span>Discount</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-800 pt-1 border-t border-green-200">
            <span>Total</span>
            <span>${(serverAmount / 100).toFixed(2)}</span>
          </div>
        </div>
      )}

      {isFree ? (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 border border-green-100 p-3 text-center text-sm text-green-700 font-medium">
            100% discount applied — no payment required
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-sm text-sm px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="flex-1 rounded-sm text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                setProcessing(true);
                await new Promise((r) => setTimeout(r, 1000));
                onSuccess();
                setProcessing(false);
              }}
              disabled={processing}
            >
              {processing ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      ) : !clientSecret ? (
        <div className="py-8 text-center text-xs text-gray-400">
          Loading payment...
        </div>
      ) : (
        <Elements
          key={clientSecret}
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <CheckoutForm
            originalFormatted={price.formatted}
            serverAmount={serverAmount}
            couponStatus={couponStatus}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </div>
  );
}

function CheckoutForm({
  originalFormatted,
  serverAmount,
  couponStatus,
  onSuccess,
  onCancel,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAmount =
    couponStatus === "valid" && serverAmount !== null
      ? `$${(serverAmount / 100).toFixed(2)}`
      : originalFormatted;

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          billing_details: { phone: "" },
        },
      },
    });

    if (error) {
      setError(error.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    onSuccess(paymentIntent?.id);
  };

  return (
    <div className="space-y-4">
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
          {paying ? "Processing..." : `Pay ${displayAmount}`}
        </button>
      </div>
    </div>
  );
}
