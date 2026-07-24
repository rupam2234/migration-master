import { NextRequest, NextResponse } from "next/server";
import { getCoupon, pool } from "@/lib";

const COUPON_USE_LIMIT_PER_SHOP = Number(process.env.COUPON_USE_LIMIT_PER_SHOP ?? 1);

export async function POST(req: NextRequest) {
    const { coupon, shopDomain } = await req.json();

    if (!coupon || !shopDomain) {
        return NextResponse.json({
            valid: false,
            discount: 0,
        });
    }

    const couponRow = await getCoupon(coupon.trim().toUpperCase());

    if (!couponRow) {
        return NextResponse.json({
            valid: false,
            discount: 0,
        });
    }

    const usage = await pool.query(
        `
            SELECT COUNT(*) AS uses
            FROM export_jobs
            WHERE coupon_id = $1 AND shop_domain = $2
              AND status IN ('PAID','FREE')
        `,
        [couponRow.id, shopDomain],
    );

    const usesSoFar = Number(usage[0].uses);

    if (usesSoFar >= COUPON_USE_LIMIT_PER_SHOP) {
        return NextResponse.json({
            valid: false,
            discount: 0,
            reason: "already_used",
        });
    }

    return NextResponse.json({
        valid: true,
        discount: couponRow.percentOff,
        couponId: couponRow.id,
    });
}