import { NextRequest, NextResponse } from "next/server";
import { getCouponDiscount } from "@/lib";

export async function POST(req: NextRequest) {
    const { coupon } = await req.json();

    if (!coupon) {
        return NextResponse.json({
            valid: false,
            discount: 0,
        });
    }

    const discount = await getCouponDiscount(
        coupon.trim().toUpperCase()
    );

    return NextResponse.json({
        valid: discount > 0,
        discount,
    });
}