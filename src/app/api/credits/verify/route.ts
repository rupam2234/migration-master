import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib";
import { verifyPaymentTransaction } from "@/lib/payment-verification";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json(
      { success: false, error: "User not authenticated" },
      { status: 401 },
    );
  }

  let body: {
    transactionId?: string;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { transactionId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
  if (!transactionId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json(
      { success: false, error: "Complete Razorpay payment data is required" },
      { status: 400 },
    );
  }

  try {
    const result = await verifyPaymentTransaction(
      transactionId,
      {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      },
      user.id,
    );
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Payment verification failed", transactionId },
        { status: 400 },
      );
    }
    return NextResponse.json({
      success: true,
      creditsAdded: result.creditsAdded,
      transactionId,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Payment verification failed" },
      { status: 500 },
    );
  }
}