import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser, pool, resend } from "@/lib";
import { emailTemplate } from "@/components";

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    const userId = user?.id;

    const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        fingerprint,
        shopDomain,
        itemCount,
    } = await req.json();

    if (!fingerprint || !shopDomain || !itemCount) {
        return NextResponse.json(
            {
                success: false,
                error: "Missing export information"
            },
            {
                status: 400
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

    if (
        razorpay_payment_id === "FREE" &&
        razorpay_order_id === "FREE" &&
        razorpay_signature === "FREE"
    ) {
        const job = await pool.query(
            `
                INSERT INTO export_jobs
                (
                    user_id,
                    fingerprint,
                    shop_domain,
                    item_count,
                    status
                )
                VALUES
                ($1,$2,$3,$4,'FREE')
                ON CONFLICT (fingerprint)
                DO UPDATE SET
                    status='FREE'
                RETURNING id
            `,
            [
                userId,
                fingerprint,
                shopDomain,
                Number(itemCount),
            ]
        );


        return NextResponse.json({
            success: true,
            free: true,
            exportJobId: job[0].id,
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
                    fingerprint,
                    shop_domain,
                    item_count,
                    status
                )
                VALUES
                    ($1,$2,$3,$4,'PAID')
                ON CONFLICT (fingerprint)
                    DO UPDATE SET
                    status='PAID'
                    RETURNING id
                `,
        [
            userId,
            fingerprint,
            shopDomain,
            Number(itemCount),
        ]
    );

    const exportJobId = jobResult[0].id;

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
            Number(itemCount),
        ]
    );

    const baseAddress = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://migrationmaster.online"

    // notify user
    const html = emailTemplate({
        title: `Payment Confirmation — Shopify to WordPress Export`,
        content: `
        <p>
          Thank you for your payment. Your order for a Shopify to WordPress export
          has been successfully completed for <strong>${Number(itemCount)} items</strong>
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
          You can find more details about this order and track your export status
          from your
          <a
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