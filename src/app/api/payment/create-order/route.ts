import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getCoupon, envInt, pool } from "@/lib";
import { calculateExportPrice } from "@/lib/pricing";

const FREE_EXPORT_LIMIT = envInt("FREE_EXPORT_LIMIT", 2);
const FREE_ITEM_LIMIT = envInt("FREE_ITEM_LIMIT", 5);
const COUPON_USE_LIMIT_PER_SHOP = envInt("COUPON_USE_LIMIT_PER_SHOP", 1);

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
    const { total: subtotal } = calculateExportPrice(itemCount);

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

        if (usesSoFar < COUPON_USE_LIMIT_PER_SHOP) {
            discount = couponRow.percentOff;
            couponId = couponRow.id;
        }
    }

    const total = subtotal * (1 - discount / 100);

    // --- Free-tier check, independent of coupon ---
    const freeUsage = await pool.query(
        `SELECT COUNT(*) AS free_count
         FROM export_jobs
         WHERE shop_domain = $1 AND status = 'FREE'`,
        [shopDomain],
    );
    const freeCount = Number(freeUsage[0].free_count);
    const withinFreeTier =
        freeCount < FREE_EXPORT_LIMIT && itemCount <= FREE_ITEM_LIMIT;

    if (total <= 0 || withinFreeTier) {
        return NextResponse.json({
            free: true,
            itemIds: newItemIds,
            shopDomain,
            resource,
            amount: 0,
            discount,
            total: 0,
            couponId,
        });
    }

    let amount = Math.round(total * 100);

    if (amount < 100) {
        amount = 100; // Razorpay minimum — bump up, don't silently waive
    }

    const order = await razorpay.orders.create({
        amount,
        currency: "USD",
        receipt: `export_${Date.now()}`,
        notes: {
            itemCount: String(itemCount),
            coupon: normalizedCoupon ?? "",
            couponId: couponId ? String(couponId) : "",
            discount: `${discount}%`,
            subtotal: String(subtotal),
            total: String(total),
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
        itemIds: newItemIds,
        shopDomain,
        resource,
        couponId,
    });
}