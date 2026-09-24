import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib";
import { getCouponQuote } from "@/lib/coupon-service";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "User not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const credits = Number(body.credits);
    const quote = await getCouponQuote(user.id, credits, body.code);
    return NextResponse.json({ success: true, quote });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Invalid discount code" },
      { status: 400 },
    );
  }
}
