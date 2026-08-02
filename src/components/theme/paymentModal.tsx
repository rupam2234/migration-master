"use client";

import { useEffect, useState } from "react";
import {
  calculateExportPrice,
  formatExportTotal,
  type PaymentCurrency,
} from "@/lib/pricing";

type PaymentModalProps = {
  itemIds: string[];
  open: boolean;
  shopDomain: string;
  resource: string;
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
  onSuccess,
  onClose,
}: PaymentModalProps) {
  if (!open) return null;

  const price = calculateExportPrice(itemIds.length);

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
          {itemIds.length} new record
          {itemIds.length !== 1 ? "s" : ""} · {price.formatted}
        </p>

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
}) {
  const [coupon, setCoupon] = useState("");
  const [, setCouponId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalAmount, setFinalAmount] = useState(price.total);
  const [discount, setDiscount] = useState(0);
  const [paymentCurrency, setPaymentCurrency] =
    useState<PaymentCurrency>("USD");
  const [exchangeRate, setExchangeRate] = useState(83);
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "checking" | "valid" | "invalid" | "used"
  >("idle");
  const normalizedResource = resource === "IMAGES" ? "MEDIA_LIBRARY" : resource;
  const minimumCharge = 1;
  const originalTotal = formatExportTotal(
    price.total,
    paymentCurrency,
    exchangeRate,
  );
  const billedAmount =
    finalAmount > 0 && finalAmount < minimumCharge
      ? minimumCharge
      : finalAmount;
  const displayBilledAmount = formatExportTotal(
    billedAmount,
    paymentCurrency,
    exchangeRate,
  );
  const hasMinimumCharge = finalAmount > 0 && finalAmount < minimumCharge;
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
                    cards_only: {
                      name: "Cards",
                      instruments: [
                        {
                          method: "card",
                        },
                      ],
                    },
                  },
            sequence:
              checkoutCurrency === "INR"
                ? ["block.preferred_methods"]
                : ["block.cards_only"],
            preferences: {
              show_default_blocks: checkoutCurrency === "INR",
            },
          },
        },

        name: "Migration Master",
        description: "Shopify to WordPress Export",

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
        <div className="flex justify-between">
          <span>Original</span>
          <span>{originalTotal}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{discount}%</span>
          </div>
        )}

        <div className="flex justify-between font-semibold border-t pt-1">
          <span>Total</span>
          <span>{displayBilledAmount}</span>
        </div>

        {hasMinimumCharge && (
          <p className="text-xs text-amber-600">
            Eligible exports under $1.00 are free for your first 3 times. After
            that, paid exports below $1.00 are rounded up to the $1.00 processor
            minimum.
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
          {loading ? "Creating Order..." : "Complete Order"}
        </button>
      </div>
    </div>
  );
}
