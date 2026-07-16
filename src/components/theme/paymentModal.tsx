"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PaymentModalProps = {
  fingerprint: string;
  open: boolean;
  shopDomain: string;
  resource: string;
  price: {
    itemCount: number;
    total: number;
    formatted: string;
  };
  onSuccess: (paymentData?: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    fingerprint?: string;
    shopDomain?: string;
    resource?: string;
    itemCount?: number;
    free?: boolean;
  }) => void;
  onClose: () => void;
};

export function PaymentModal({
  open,
  price,
  fingerprint,
  shopDomain,
  resource,
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
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          Confirm Export
        </h3>

        <p className="text-xs text-gray-400 mb-4">
          {price.itemCount} record
          {price.itemCount !== 1 ? "s" : ""} · {price.formatted}
        </p>

        <CheckoutWrapper
          price={price}
          onSuccess={onSuccess}
          onCancel={onClose}
          fingerprint={fingerprint}
          shopDomain={shopDomain}
          resource={resource}
        />
      </div>
    </div>
  );
}

function CheckoutWrapper({
  price,
  onSuccess,
  onCancel,
  fingerprint,
  resource,
  shopDomain,
}: {
  price: {
    itemCount: number;
    total: number;
    formatted: string;
  };
  onSuccess: PaymentModalProps["onSuccess"];
  onCancel: () => void;
  fingerprint: string;
  shopDomain: string;
  resource: string;
}) {
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalAmount, setFinalAmount] = useState(price.total);
  const [discount, setDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      console.log("Razorpay loaded");
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const verifyCoupon = async () => {
    if (!coupon.trim()) return;

    setCouponStatus("checking");

    try {
      const res = await fetch("/api/payment/coupons/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coupon: coupon.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setDiscount(data.discount);

        const newTotal = price.total * (1 - data.discount / 100);

        setFinalAmount(newTotal);

        setCouponStatus("valid");
      } else {
        setDiscount(0);
        setFinalAmount(price.total);
        setCouponStatus("invalid");
      }
    } catch (error) {
      console.error(error);
      setCouponStatus("invalid");
    }
  };

  const startPayment = async () => {
    if (!window.Razorpay) {
      alert("Payment system loading...");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemCount: price.itemCount,
          coupon: coupon.trim().toUpperCase(),
          fingerprint,
          shopDomain,
          resource,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      if (data.free) {
        onSuccess({
          razorpay_payment_id: "FREE",
          razorpay_order_id: "FREE",
          razorpay_signature: "FREE",
          fingerprint: data.fingerprint,
          shopDomain: data.shopDomain,
          resource: data.resource,
          itemCount: data.itemCount,
          free: true,
        });

        return;
      }

      setFinalAmount(data.total);
      setDiscount(data.discount);

      const options = {
        key: process.env.RAZORPAY_KEY,

        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,

        name: "Migration Master",
        description: "Shopify to WordPress Export",

        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          onSuccess({
            ...response,
            fingerprint,
            shopDomain,
            resource,
            itemCount: price.itemCount,
          });

          setLoading(false);
        },

        modal: {
          ondismiss() {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.open();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Coupon code</label>

        <div className="flex gap-2">
          <input
            value={coupon}
            onChange={(e) => {
              setCoupon(e.target.value.toUpperCase());
              setCouponStatus("idle");
            }}
            placeholder="SAVE20"
            className="flex-1 rounded-sm border px-3 py-1.5 text-sm"
          />

          <button
            onClick={verifyCoupon}
            disabled={couponStatus === "checking"}
            className="rounded-sm border px-3 text-sm"
          >
            {couponStatus === "checking" ? "..." : "Apply"}
          </button>
        </div>

        {couponStatus === "valid" && (
          <p className="text-xs text-green-600 mt-1">
            ✓ {discount}% discount applied
          </p>
        )}

        {couponStatus === "invalid" && (
          <p className="text-xs text-red-500 mt-1">Invalid or expired coupon</p>
        )}
      </div>

      <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span>Original</span>
          <span>{price.formatted}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{discount}%</span>
          </div>
        )}

        <div className="flex justify-between font-semibold border-t pt-1">
          <span>Total</span>
          <span>${finalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-sm border px-3 py-1.5 text-sm"
        >
          Cancel
        </button>

        <button
          onClick={startPayment}
          disabled={loading}
          className="flex-1 rounded-sm bg-blue-600 px-3 py-1.5 text-sm text-white"
        >
          {loading ? "Opening..." : "Pay"}
        </button>
      </div>
    </div>
  );
}
