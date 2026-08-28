"use client";

import { useEffect, useState } from "react";
import { calculateTieredPrice } from "@/lib/pricing/tiered";
import {
  formatExportTotal,
  formatCurrencyAmount,
  type PaymentCurrency,
} from "@/lib/pricing";

type PaymentModalProps = {
  itemIds: string[];
  open: boolean;
  shopDomain: string;
  resource: string;
  initialCurrency?: PaymentCurrency;
  initialExchangeRate?: number;
  freeDownloadsUsed?: number;
  freeDownloadsLimit?: number;
  eligibleForFree?: boolean;
  onSuccess: (paymentData?: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    itemIds?: string[];
    shopDomain?: string;
    resource?: string;
    free?: boolean;
    couponId?: number | null;
  }) => void;
  onClose: () => void;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaymentModal({
  open,
  itemIds,
  shopDomain,
  resource,
  initialCurrency,
  initialExchangeRate,
  freeDownloadsUsed = 0,
  freeDownloadsLimit = 3,
  eligibleForFree = false,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  if (!open) return null;

  const total = calculateTieredPrice(itemIds.length);
  const price = {
    count: itemIds.length,
    total,
    formatted: `$${total.toFixed(2)}`,
  };

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

        <p className="text-xs text-gray-400 mb-2">
          {itemIds.length} new record
          {itemIds.length !== 1 ? "s" : ""} · {price.formatted}
        </p>

        <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Free downloads used:{" "}
          <strong>
            {freeDownloadsUsed}/{freeDownloadsLimit}
          </strong>{" "}
          ·{" "}
          <span
            className={
              eligibleForFree
                ? "font-semibold text-green-700"
                : "font-semibold text-red-700"
            }
          >
            {eligibleForFree
              ? "This export is FREE"
              : "This export will be charged"}
          </span>
        </div>

        {itemIds.length === 0 && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No exportable items were found in your current selection. Please
            select at least one item to continue.
          </div>
        )}

        <CheckoutWrapper
          price={price}
          itemIds={itemIds}
          onSuccess={onSuccess}
          onCancel={onClose}
          shopDomain={shopDomain}
          resource={resource}
          initialCurrency={initialCurrency}
          initialExchangeRate={initialExchangeRate}
        />
      </div>
    </div>
  );
}

function CheckoutWrapper({
  price,
  itemIds,
  onSuccess,
  onCancel,
  resource,
  shopDomain,
  initialCurrency,
  initialExchangeRate,
}: {
  price: {
    count: number;
    total: number;
    formatted: string;
  };
  itemIds: string[];
  onSuccess: PaymentModalProps["onSuccess"];
  onCancel: () => void;
  shopDomain: string;
  resource: string;
  initialCurrency?: PaymentCurrency;
  initialExchangeRate?: number;
}) {
  const [coupon, setCoupon] = useState("");
  const [, setCouponId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalAmount, setFinalAmount] = useState(price.total);
  const [discount, setDiscount] = useState(0);
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>(
    initialCurrency ?? "USD",
  );
  const [exchangeRate, setExchangeRate] = useState(initialExchangeRate ?? 83);
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "checking" | "valid" | "invalid" | "used"
  >("idle");
  const normalizedResource = resource === "IMAGES" ? "MEDIA_LIBRARY" : resource;
  const minimumCharge = 1;

  // Currency-aware display of the processor minimum floor (e.g. "$1.00" vs "₹92").
  const minimumChargeDisplay = (() => {
    if (paymentCurrency === "INR") {
      const floorInr = minimumCharge * exchangeRate; // $1 → ₹92 at 92x
      return `${formatCurrencyAmount(floorInr, "INR")} (≈ ${minimumCharge} USD × ${exchangeRate.toFixed(2)})`;
    }
    return `${formatCurrencyAmount(minimumCharge, "USD")}`;
  })();

  const originalTotal = formatExportTotal(
    price.total,
    paymentCurrency,
    exchangeRate,
  );

  const isFreeViaCoupon = discount >= 100;
  const hasMinimumCharge =
    !isFreeViaCoupon && finalAmount > 0 && finalAmount < minimumCharge;
  const canStartPayment =
    itemIds.length > 0 && Boolean(shopDomain) && Boolean(normalizedResource);

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

  const verifyCoupon = async (code: string) => {
    if (!code.trim()) {
      setDiscount(0);
      setCouponId(null);
      setFinalAmount(price.total);
      setCouponStatus("idle");
      return;
    }

    setCouponStatus("checking");

    try {
      const res = await fetch("/api/payment/coupons/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coupon: code.trim().toUpperCase(),
          shopDomain,
        }),
      });

      const data = await res.json();

      if (data.valid) {
        setDiscount(data.discount);
        setCouponId(data.couponId ?? null);

        const newTotal = price.total * (1 - data.discount / 100);

        setFinalAmount(newTotal);

        setCouponStatus("valid");
      } else {
        setDiscount(0);
        setCouponId(null);
        setFinalAmount(price.total);
        setCouponStatus(data.reason === "already_used" ? "used" : "invalid");
      }
    } catch (error) {
      console.error(error);
      setCouponStatus("invalid");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      verifyCoupon(coupon);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupon, shopDomain]);

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
          itemIds,
          coupon: coupon.trim().toUpperCase(),
          shopDomain,
          resource: normalizedResource,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      if (data.free) {
        setPaymentCurrency(data.currency === "INR" ? "INR" : "USD");
        setExchangeRate(Number(data.exchangeRate ?? 83));
        onSuccess({
          razorpay_payment_id: "FREE",
          razorpay_order_id: "FREE",
          razorpay_signature: "FREE",
          itemIds: data.itemIds,
          shopDomain: data.shopDomain,
          resource: data.resource,
          free: true,
          couponId: data.couponId ?? null,
        });

        return;
      }

      setDiscount(data.discount);
      const checkoutCurrency: PaymentCurrency =
        data.currency === "INR" ? "INR" : "USD";
      setPaymentCurrency(checkoutCurrency);
      setExchangeRate(Number(data.exchangeRate ?? 83));

      console.log(data.currency);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,

        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,

        config: {
          display: {
            blocks:
              checkoutCurrency === "INR"
                ? {
                    preferred_methods: {
                      name: "Preferred Payment Methods",
                      instruments: [
                        {
                          method: "upi",
                        },
                      ],
                    },
                  }
                : {
                    preferred_methods: {
                      name: "Other Payment Methods",
                      instruments: [
                        {
                          method: "card",
                        },
                        {
                          method: "paypal",
                        },
                      ],
                    },
                  },

            sequence: ["block.preferred_methods"],

            preferences: {
              show_default_blocks: checkoutCurrency === "INR",
            },
          },
        },

        name: "Migration Master",
        description: "Effortless Website Data Migration Utility",

        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          onSuccess({
            ...response,
            itemIds: data.itemIds,
            shopDomain,
            resource,
            couponId: data.couponId ?? null,
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

        <input
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="SAVE20"
          className="w-full rounded-sm border px-3 py-1.5 text-sm"
        />

        {couponStatus === "checking" && (
          <p className="text-xs text-gray-400 mt-1">Checking…</p>
        )}

        {couponStatus === "valid" && (
          <p className="text-xs text-green-600 mt-1">
            ✓ {discount}% discount applied
          </p>
        )}

        {couponStatus === "invalid" && (
          <p className="text-xs text-red-500 mt-1">Invalid or expired coupon</p>
        )}

        {couponStatus === "used" && (
          <p className="text-xs text-red-500 mt-1">
            You&apos;ve already used this coupon
          </p>
        )}
      </div>

      <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{discount}%</span>
          </div>
        )}

        {!isFreeViaCoupon && (
          <div className="flex justify-between">
            <span>Estimated total</span>
            <span>{originalTotal}</span>
          </div>
        )}

        {hasMinimumCharge && (
          <p className="text-xs text-amber-600">
            Eligible exports under {minimumChargeDisplay} are free for your
            first 3 times. After that, paid exports below {minimumChargeDisplay}{" "}
            are rounded up to the processor minimum.
          </p>
        )}
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
          disabled={loading || couponStatus === "checking" || !canStartPayment}
          className="flex-1 rounded-sm bg-blue-600 px-3 py-1.5 text-sm text-white"
        >
          {loading
            ? "Creating Order..."
            : isFreeViaCoupon
              ? "Download Free"
              : "Complete Order"}
        </button>
      </div>
    </div>
  );
}
