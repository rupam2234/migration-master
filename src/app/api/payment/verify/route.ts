import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser, pool } from "@/lib";

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


    return NextResponse.json({
        success: true,
        exportJobId,
    });
}