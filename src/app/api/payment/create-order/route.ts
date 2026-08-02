import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import {
    getCoupon,
    envInt,
    pool,
    refreshShopifyAccessToken,
} from "@/lib";
import {
    calculateExportPrice,
    convertExportTotal,
    fetchLiveUsdToInrRate,
    type PaymentCurrency,
} from "@/lib/pricing";

const API_VERSION = "2026-01";
const FREE_EXPORT_LIMIT = envInt("FREE_EXPORT_LIMIT", 3);
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

    const orderCurrency = await resolvePaymentCurrency(req, shopDomain);
    const usdToInrRate =
        orderCurrency === "INR" ? await getLiveUsdToInrRate() : 1;

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

        const couponLimit = couponRow.code === "SAVE100" ? 1 : COUPON_USE_LIMIT_PER_SHOP;
        if (usesSoFar < couponLimit) {
            discount = couponRow.percentOff;
            couponId = couponRow.id;
        }
    }

    const total = subtotal * (1 - discount / 100);
    const convertedTotal = convertExportTotal(total, orderCurrency, usdToInrRate);

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
            currency: orderCurrency,
            exchangeRate: usdToInrRate,
        });
    }

    let amount = Math.round(convertedTotal * 100);

    if (amount < 100) {
        amount = 100; // Razorpay minimum — bump up, don't silently waive
    }

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

async function resolvePaymentCurrency(
    req: NextRequest,
    shopDomain: string,
): Promise<PaymentCurrency> {
    const detectedCountry =
        req.headers.get("x-vercel-ip-country")?.toUpperCase() ??
        req.headers.get("cf-ipcountry")?.toUpperCase() ??
        null;

    if (detectedCountry === "IN") {
        return "INR";
    }

    if (detectedCountry) {
        return "USD";
    }

    const connection = await pool.query(
        `
            SELECT
                s."accessToken",
                s."refreshToken",
                s."expires",
                s."refreshTokenExpires",
                sc.status
            FROM shopify."Session" s
            JOIN shopify_connections sc
              ON sc.shop_domain = s.shop
            WHERE s.shop = $1
        `,
        [shopDomain],
    );

    const credential = connection[0];

    if (!credential) {
        return "USD";
    }

    if (credential.status !== "CONNECTED") {
        return "USD";
    }

    let accessToken = credential.accessToken;
    const expiresAt = new Date(credential.expires).getTime();

    if (Date.now() >= expiresAt) {
        const refreshed = await refreshShopifyAccessToken(
            shopDomain,
            credential.refreshToken,
        );

        accessToken = refreshed.access_token;

        await pool.query(
            `
                UPDATE shopify."Session"
                SET
                    "accessToken" = $1,
                    "refreshToken" = $2,
                    "expires" = NOW() + ($3 * interval '1 second'),
                    "refreshTokenExpires" = NOW() + ($4 * interval '1 second')
                WHERE shop = $5
            `,
            [
                refreshed.access_token,
                refreshed.refresh_token,
                refreshed.expires_in,
                refreshed.refresh_token_expires_in,
                shopDomain,
            ],
        );
    }

    const response = await fetch(
        `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
                query: `
                    query ShopPaymentContext {
                        shop {
                            currencyCode
                            billingAddress {
                                countryCode
                            }
                        }
                    }
                `,
            }),
            cache: "no-store",
        },
    );

    if (!response.ok) {
        return "USD";
    }

    const json = await response.json();
    const shop = json.data?.shop;
    const currencyCode = String(shop?.currencyCode ?? "").toUpperCase();
    const countryCode = String(shop?.billingAddress?.countryCode ?? "").toUpperCase();

    if (currencyCode === "INR" || countryCode === "IN") {
        return "INR";
    }

    return "USD";
}

async function getLiveUsdToInrRate(): Promise<number> {
    try {
        return await fetchLiveUsdToInrRate();
    } catch (error) {
        console.warn("Falling back to static USD/INR rate", error);
        return 83;
    }
}
