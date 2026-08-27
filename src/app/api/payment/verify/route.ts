import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser, pool, resend, envInt, getCouponById } from "@/lib";
import { emailTemplate } from "@/components";
import { razorpay } from "@/lib/razorpay";

const FREE_EXPORT_LIMIT = envInt("FREE_EXPORT_LIMIT", 3);
const FREE_ITEM_LIMIT = envInt("FREE_ITEM_LIMIT", 5);
const FREE_IMAGE_LIMIT = envInt("FREE_IMAGE_LIMIT", 3000);
const COUPON_USE_LIMIT_PER_SHOP = envInt("COUPON_USE_LIMIT_PER_SHOP", 1);

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    const userId = user?.id;

    if (!userId) {
        return NextResponse.json(
            { success: false, error: "User not authenticated" },
            { status: 401 },
        );
    }

    const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        shopDomain,
        resource,
        itemIds,
        couponId,
    } = await req.json();

    if (!shopDomain || !resource || !Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json(
            {
                success: false,
                error: "Missing export information",
            },
            {
                status: 400,
            }
        );
    }

    // Re-derive what's actually new server-side — never trust the client's
    // claim that these ids are unowned, same principle as create-order.
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

    const recordOwnership = async (
        exportJobId: string,
        shopDomain: string,
        resource: string,
        itemIds: string[],
    ) => {
        if (itemIds.length === 0) return;
        const values = itemIds
            .map((_, i) => `($1, $2, $${i + 3}, $${itemIds.length + 3})`)
            .join(",");
        await pool.query(
            `INSERT INTO exported_items (shop_domain, resource, item_id, export_job_id)
           VALUES ${values}
           ON CONFLICT (shop_domain, resource, item_id) DO NOTHING`,
            [shopDomain, resource, ...itemIds, exportJobId],
        );
    };

    if (
        razorpay_payment_id === "FREE" &&
        razorpay_order_id === "FREE" &&
        razorpay_signature === "FREE"
    ) {
        let eligible = false;

        if (newItemIds.length === 0) {
            // Nothing new to grant — everything requested is already owned.
            eligible = true;
        } else if (couponId) {
            // Free via a valid 100%-off coupon — checked against its own
            // per-shop usage cap, independent of the free tier. Mirrors
            // coupons/verify and create-order: SAVE100 is limited to 1 use.
            const couponRow = await getCouponById(couponId);
            if (couponRow && couponRow.percentOff >= 100) {
                const usage = await pool.query(
                    `
                        SELECT COUNT(*) AS uses
                        FROM export_jobs
                        WHERE coupon_id = $1 AND shop_domain = $2
                          AND status IN ('PAID','FREE')
                    `,
                    [couponId, shopDomain]
                );
                const usesSoFar = Number(usage[0].uses);
                const couponLimit =
                    couponRow.code === "SAVE100"
                        ? 1
                        : COUPON_USE_LIMIT_PER_SHOP;
                eligible = usesSoFar < couponLimit;
            }
        } else {
            // Hard free-cap: a new-item export is FREE only while the shop is
            // below the free-export cap AND within the item/image limit.
            const freeUsage = await pool.query(
                `
                    SELECT COUNT(*) AS free_count
                    FROM export_jobs
                    WHERE shop_domain = $1 AND status = 'FREE'
                `,
                [shopDomain]
            );

            const freeCount = Number(freeUsage[0].free_count);
            const freeItemLimit =
                resource === "MEDIA_LIBRARY" ? FREE_IMAGE_LIMIT : FREE_ITEM_LIMIT;
            eligible =
                freeCount < FREE_EXPORT_LIMIT &&
                newItemIds.length <= freeItemLimit;
        }

        if (!eligible) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Not eligible for a free export",
                },
                { status: 403 }
            );
        }

        const job = await pool.query(
            `
                INSERT INTO export_jobs
                (
                    user_id,
                    shop_domain,
                    item_count,
                    status,
                    coupon_id
                )
                VALUES
                ($1,$2,$3,'FREE',$4)
                RETURNING id
            `,
            [
                userId,
                shopDomain,
                newItemIds.length,
                couponId ?? null,
            ]
        );

        const exportJobId = job[0].id;
        await recordOwnership(exportJobId, shopDomain, resource, itemIds);

        return NextResponse.json({
            success: true,
            free: true,
            exportJobId,
        });
    }

    if (
        !razorpay_payment_id ||
        !razorpay_order_id ||
        !razorpay_signature
    ) {
        return NextResponse.json(
            {
                success: false,
                error: "Missing payment details",
            },
            { status: 400 }
        );
    }

    const razorpaySecret = process.env.RAZORPAY_SECRET;
    // const razorpaySecret = process.env.TEST_RAZORPAY_SECRET; // for testing

    if (!razorpaySecret) {
        console.error("[verify] RAZORPAY_SECRET is not configured");
        return NextResponse.json(
            {
                success: false,
                error: "Payment verification is not configured on the server",
            },
            { status: 503 },
        );
    }

    const body =
        razorpay_order_id +
        "|" +
        razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", razorpaySecret)
        .update(body)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        console.error(
            "[verify] Signature mismatch. Computed from: order_id + '|' + payment_id",
            "Order ID is truthy:",
            Boolean(razorpay_order_id),
            "Payment ID is truthy:",
            Boolean(razorpay_payment_id),
            "Signature is truthy:",
            Boolean(razorpay_signature),
            "Secret configured:",
            Boolean(razorpaySecret),
        );
        return NextResponse.json(
            {
                success: false,
                error:
                    "Payment signature verification failed. If this persists after a retry, contact support with the payment ID — your card was NOT charged again.",
            },
            { status: 400 }
        );
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    const amount = razorpayOrder.amount;
    const currency = razorpayOrder.currency;

    if (!amount || !currency) {
        return NextResponse.json(
            {
                success: false,
                error: "Unable to retrieve payment amount from Razorpay",
            },
            { status: 400 }
        );
    }

    // get the coupon details
    let couponData = null;
    if (couponId) {
        couponData = await pool.query(`SELECT code, percent_off FROM coupons WHERE id = $1`, [couponId]);
    }

    // flow -> fresh order? -> go ahead create a new one -> return the id -> it's a full transection
    const txResult = await pool.transaction([
        pool`SELECT pg_advisory_xact_lock(hashtext(${razorpay_order_id}))`,
        pool`
          WITH existing AS (
            SELECT export_job_id
            FROM payments
            WHERE razorpay_order_id = ${razorpay_order_id}
          ), 
          job AS (
            INSERT INTO export_jobs (user_id, shop_domain, item_count, status, coupon_id)
            SELECT ${userId}, ${shopDomain}, ${newItemIds.length}, 'PAID', ${couponId ?? null}
            WHERE NOT EXISTS (SELECT 1 FROM existing)
            RETURNING id
          ),
          pay AS (
            INSERT INTO payments
            (
                user_id,
                export_job_id,
                provider,
                status,
                amount,
                shop_domain,
                currency,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                discount_percent,
                coupon_code,
                item_count
            )
            SELECT
                ${userId},
                job.id,
                'razorpay',
                'PAID',
                ${amount as number / 100},
                ${shopDomain},
                ${currency},
                ${razorpay_order_id},
                ${razorpay_payment_id},
                ${razorpay_signature},
                ${couponData?.[0].percent_off},
                ${couponData?.[0].code},
                ${newItemIds.length}
            FROM job
            RETURNING export_job_id
          )
          SELECT
            COALESCE((SELECT export_job_id FROM existing), (SELECT export_job_id FROM pay)) AS export_job_id,
            EXISTS(SELECT 1 FROM existing) AS was_duplicate
        `,
    ]);

    const { export_job_id: exportJobId, was_duplicate: wasDuplicate } =
        (txResult[1] as any[])[0];

    await recordOwnership(exportJobId, shopDomain, resource, newItemIds);

    if (wasDuplicate) {
        // Already processed (and already emailed) on an earlier call for this
        // exact order_id — confirm success without re-sending the email or
        // touching billing again.
        return NextResponse.json({ success: true, exportJobId });
    }

    const baseAddress = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://migrationmaster.online"

    const html = emailTemplate({
        title: `Payment Confirmation — Shopify to WordPress Export`,
        content: `
            <p>
                Thank you for your payment. Your order for a Shopify to WordPress
                export has been successfully completed for
                <strong>${newItemIds.length} item${newItemIds.length !== 1 ? "s" : ""}</strong>
                from your store <strong>${shopDomain}</strong>.
            </p>
    
            <p>
                You can view your payment details here:
                <a
                    href="https://razorpay.com/payment/${razorpay_payment_id}"
                    style="color:#CC6CE7; text-decoration:underline;"
                >
                    Payment receipt
                </a>.
            </p>
    
            <p>
                You can find more details about this order and track your export
                status from your
                <a
                    href="${baseAddress}/dashboard/${encodeURIComponent(shopDomain)}/export-jobs"
                    style="color:#CC6CE7; text-decoration:underline;"
                >
                    export job details page
                </a>.
            </p>
    
            <p>
                If you experience any issues during the migration process, our team
                is always available to help. Feel free to reach out and we'll assist you.
            </p>
    
            <p>
                Happy migrating!<br />
                The Migration Master Team
            </p>
        `,
    });

    await resend.emails.send({
        from: "Migration Master <client@migrationmaster.online>",
        to: [user.email],
        cc: ["support@migrationmaster.online"],
        subject: `Payment Confirmed — Shopify to WordPress Export`,
        html,
    });

    return NextResponse.json({
        success: true,
        exportJobId,
    });
}