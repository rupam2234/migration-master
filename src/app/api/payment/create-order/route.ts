import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import {
    getCoupon,
    envInt,
    pool,
} from "@/lib";
import {
    resolvePaymentCurrency,
    getUsdToInrRate,
} from "@/lib/payment-currency";
import { calculateTieredPrice } from "@/lib/pricing/tiered";
import { convertExportTotal } from "@/lib/pricing";

const FREE_EXPORT_LIMIT = envInt("FREE_EXPORT_LIMIT", 3);
const FREE_ITEM_LIMIT = envInt("FREE_ITEM_LIMIT", 5);
const FREE_IMAGE_LIMIT = envInt("FREE_IMAGE_LIMIT", 3000);
const COUPON_USE_LIMIT_PER_SHOP = envInt("COUPON_USE_LIMIT_PER_SHOP", 1);
const MINIMUM_CHARGE_USD = 1;

export async function POST(req: NextRequest) {
    const { itemIds, coupon, shopDomain, resource } = await req.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json({ error: "itemIds is required" }, { status: 400 });
    }
    if (!shopDomain || !resource) {
        return NextResponse.json(
            { error: "shopDomain and resource are required" },
            { status: 400 },
        );
    }

    const orderCurrency = await resolvePaymentCurrency(req, shopDomain);
    const usdToInrRate = await getUsdToInrRate(orderCurrency);

    // Re-derive "new" items server-side — never trust that the client only
    // sent unowned items. This mirrors check-export's own logic.
    const owned = await pool.query(
        `
            SELECT item_id
            FROM exported_items
            WHERE shop_domain = $1 AND resource = $2 AND item_id = ANY($3)
        `,
        [shopDomain, resource, itemIds],
    );
    const ownedIds = new Set(owned.map((r: any) => r.item_id));
    const newItemIds = itemIds.filter((id: string) => !ownedIds.has(id));

    if (newItemIds.length === 0) {
        // Nothing new to charge for — everything requested is already owned.
        return NextResponse.json({
            free: true,
            itemIds: [],
            shopDomain,
            resource,
            amount: 0,
            discount: 0,
            total: 0,
            couponId: null,
        });
    }

    const itemCount = newItemIds.length;
    const normalizedCoupon = coupon?.trim().toUpperCase() || undefined;
    const subtotal = calculateTieredPrice(itemCount);

    // --- Coupon lookup + per-shop usage cap ---
    let discount = 0;
    let couponId: number | null = null;

    const couponRow = await getCoupon(normalizedCoupon);

    if (couponRow) {
        const usage = await pool.query(
            `SELECT COUNT(*) AS uses
             FROM export_jobs
             WHERE coupon_id = $1 AND shop_domain = $2
               AND status IN ('PAID','FREE')`,
            [couponRow.id, shopDomain],
        );

        const usesSoFar = Number(usage[0].uses);

        const couponLimit = couponRow.code === "SAVE100" ? 1 : COUPON_USE_LIMIT_PER_SHOP;
        if (usesSoFar < couponLimit) {
            discount = couponRow.percentOff;
            couponId = couponRow.id;
        }
    }

    const total = subtotal * (1 - discount / 100);

    // --- Free via a valid 100%-off coupon (independent of the free tier) ---
    // A 100%-off coupon (e.g. SAVE100) is checked against its own per-shop
    // usage cap in the coupon block above. If it's valid and here, the order
    // is FREE (charge $0) — NOT floored up to $1. This is separate from the
    // free-tier cap below.
    if (discount >= 100) {
        return NextResponse.json({
            free: true,
            itemIds: newItemIds,
            shopDomain,
            resource,
            amount: 0,
            discount,
            total: 0,
            couponId,
            currency: orderCurrency,
            exchangeRate: usdToInrRate,
        });
    }

    // --- Hard free-tier check (absolute cap, no coupon / under-$1 bypass) ---
    // A new-item export is FREE only while the shop's total free-export count
    // is below the cap AND the item count is within the free item/image limit.
    // Coupons and sub-$1 amounts do NOT grant free beyond this cap.
    const freeUsage = await pool.query(
        `SELECT COUNT(*) AS free_count
         FROM export_jobs
         WHERE shop_domain = $1 AND status = 'FREE'`,
        [shopDomain],
    );
    const freeCount = Number(freeUsage[0].free_count);
    const freeItemLimit =
        resource === "MEDIA_LIBRARY" ? FREE_IMAGE_LIMIT : FREE_ITEM_LIMIT;
    const withinFreeTier =
        freeCount < FREE_EXPORT_LIMIT && itemCount <= freeItemLimit;

    if (withinFreeTier) {
        return NextResponse.json({
            free: true,
            itemIds: newItemIds,
            shopDomain,
            resource,
            amount: 0,
            discount,
            total: 0,
            couponId,
            currency: orderCurrency,
            exchangeRate: usdToInrRate,
        });
    }

    // Apply the $1 processor minimum to the USD total BEFORE converting to
    // the order currency. This only floors a genuine undersized PAID total
    // (between $0 and $1) — it does NOT apply to a 0-total from a 100%-off
    // coupon, which is handled free above, nor to an empty/free order.
    let chargeTotalUsd = total;
    if (chargeTotalUsd > 0 && chargeTotalUsd < MINIMUM_CHARGE_USD) {
        chargeTotalUsd = MINIMUM_CHARGE_USD;
    }

    const convertedTotal = convertExportTotal(
        chargeTotalUsd,
        orderCurrency,
        usdToInrRate,
    );

    const amount = Math.round(convertedTotal * 100);

    const order = await razorpay.orders.create({
        amount,
        currency: orderCurrency,
        receipt: `export_${Date.now()}`,
        notes: {
            itemCount: String(itemCount),
            coupon: normalizedCoupon ?? "",
            couponId: couponId ? String(couponId) : "",
            discount: `${discount}%`,
            subtotal: String(subtotal),
            total: String(convertedTotal),
            exchangeRate: String(usdToInrRate),
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
        total: convertedTotal,
        exchangeRate: usdToInrRate,
        itemIds: newItemIds,
        shopDomain,
        resource,
        couponId,
    });
}
