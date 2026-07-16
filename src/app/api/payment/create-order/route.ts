import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getCouponDiscount } from "@/lib";
import { PRICE_PER_ITEM } from "@/lib/pricing";

export async function POST(req: NextRequest) {
    const {
        itemCount,
        coupon,
        fingerprint,
        shopDomain,
        resource,
    } = await req.json();

    if (!Number.isInteger(itemCount) || itemCount < 1) {
        return NextResponse.json(
            { error: "Invalid itemCount" },
            { status: 400 }
        );
    }

    const normalizedCoupon =
        coupon?.trim().toUpperCase() || undefined;
    const subtotal = itemCount * PRICE_PER_ITEM;
    const discount = await getCouponDiscount(normalizedCoupon);
    const total = subtotal * (1 - discount / 100);


    // 100% coupon
    if (total <= 0) {
        return NextResponse.json({
            free: true,
            fingerprint,
            itemCount,
            shopDomain,
            resource,
            amount: 0,
            discount,
            total: 0,
        });
    }

    const amount = Math.round(total * 100);

    if (amount < 100) {
        return NextResponse.json({
            free: true,
            fingerprint,
            itemCount,
            shopDomain,
            resource,
            amount: 0,
            discount,
            total: 0,
        });
    }

    const order = await razorpay.orders.create({
        amount,
        currency: "USD",
        receipt: `export_${Date.now()}`,

        notes: {
            itemCount: String(itemCount),
            coupon: normalizedCoupon ?? "",
            discount: `${discount}%`,
            subtotal: String(subtotal),
            total: String(total),

            // important for payment to export verification
            fingerprint,
            shopDomain,
            resource,
        },
    });

    return NextResponse.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,

        subtotal,
        discount,
        total,

        fingerprint,
        itemCount,
        shopDomain,
        resource,
    });
}