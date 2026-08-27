import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser, pool, resend, envInt, getCouponById } from "@/lib";
import { emailTemplate } from "@/components";

const FREE_EXPORT_LIMIT = envInt("FREE_EXPORT_LIMIT", 3);
const FREE_ITEM_LIMIT = envInt("FREE_ITEM_LIMIT", 5);
const FREE_IMAGE_LIMIT = envInt("FREE_IMAGE_LIMIT", 3000);
const COUPON_USE_LIMIT_PER_SHOP = envInt("COUPON_USE_LIMIT_PER_SHOP", 1);

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    const userId = user?.id;

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

    if (!userId) {
        return NextResponse.json(
            {
                success: false,
                error: "User not authenticated",
            },
            { status: 401 }
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

    const recordOwnership = async (exportJobId: string) => {
        if (newItemIds.length === 0) return;

        const values = newItemIds
            .map(
                (_: string, i: number) =>
                    `($1, $2, $${i + 3}, $${newItemIds.length + 3})`,
            )
            .join(",");

        await pool.query(
            `
                INSERT INTO exported_items (shop_domain, resource, item_id, export_job_id)
                VALUES ${values}
                ON CONFLICT (shop_domain, resource, item_id) DO NOTHING
            `,
            [shopDomain, resource, ...newItemIds, exportJobId],
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
        await recordOwnership(exportJobId);

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

    const body =
        razorpay_order_id +
        "|" +
        razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac(
            "sha256",
            process.env.RAZORPAY_SECRET!
        )
        .update(body)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        return NextResponse.json(
            {
                success: false,
                error: "Invalid signature",
            },
            { status: 400 }
        );
    }

    const jobResult = await pool.query(
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
                    ($1,$2,$3,'PAID',$4)
                    RETURNING id
                `,
        [
            userId,
            shopDomain,
            newItemIds.length,
            couponId ?? null,
        ]
    );

    const exportJobId = jobResult[0].id;
    await recordOwnership(exportJobId);

    await pool.query(
        `
            INSERT INTO payments
            (
                user_id,
                export_job_id,
                provider,
                status,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                item_count
            )
            VALUES
            (
                $1,
                $2,
                'razorpay',
                'PAID',
                $3,
                $4,
                $5,
                $6
            )
            `,
        [
            userId,
            exportJobId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            newItemIds.length,
        ]
    );

    const baseAddress = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://migrationmaster.online"

    const html = emailTemplate({
        title: `Payment Confirmation — Shopify to WordPress Export`,
        content: `
        <p>
          Thank you for your payment. Your order for a Shopify to WordPress export
          has been successfully completed for <strong>${newItemIds.length} items</strong>
          from your store <strong>${shopDomain}</strong>.
        </p>
    
        <p>
          You can view your payment details here:
          
            href="https://razorpay.com/payment/${razorpay_payment_id}"
            style="color:#CC6CE7; text-decoration:underline;"
          >
            Payment receipt
          </a>.
        </p>
    
        <p>
          You can find more details about this order and track your export status
          from your
          
            href="${baseAddress}/dashboard/${shopDomain}/export-jobs"
            style="color:#CC6CE7; text-decoration:underline;"
          >
            export job details page
          </a>.
        </p>
    
        <p>
          If you experience any issues during the migration process, our team is
          always available to help. Feel free to reach out and we'll assist you.
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