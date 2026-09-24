import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib';
import { createPaymentTransaction } from '@/lib/payment-transaction';
import { getAvailablePaymentMethods, getUserLocation } from '@/lib/payment-system';
import { getUserCreditBalance } from '@/lib/payment-utils';
import { getCouponQuote } from '@/lib/coupon-service';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    const { creditsRequested, paymentMethodId, couponCode } = await req.json();
    
    // Validate input
    if (!creditsRequested || creditsRequested < 1) {
      return NextResponse.json(
        { error: 'Valid credits amount is required' },
        { status: 400 }
      );
    }
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }
    
    // Calculate price based on your pricing structure
    // const priceInfo = calculatePrice(creditsRequested);
    
    // Get user location
    const { isIndian } = await getUserLocation(user.id);
    
    // Only Razorpay is currently available. Reject PayPal and any other
    // legacy payment method at the server boundary as well as hiding it in UI.
    const availableMethods = getAvailablePaymentMethods(isIndian);
    const paymentMethod = availableMethods.find((method) => method.id === paymentMethodId);
    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }
    
    // Get current credit balance
    const currentCredits = await getUserCreditBalance(user.id);
    const couponQuote = couponCode
      ? await getCouponQuote(user.id, Number(creditsRequested), couponCode)
      : undefined;

    // Create payment transaction
    const transaction = await createPaymentTransaction(
      user.id,
      creditsRequested,
      paymentMethod,
      couponQuote
    );
    
    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      paymentOrderId: transaction.transactionId,
      amountUsd: transaction.amountUsd,
      amountInr: transaction.amountInr,
      originalAmountUsd: transaction.originalAmountUsd,
      originalAmountInr: transaction.originalAmountInr,
      discountAmountUsd: transaction.discountAmountUsd,
      discountAmountInr: transaction.discountAmountInr,
      isFree: transaction.isFree,
      coupon: transaction.coupon ?? null,
      creditsRequested: transaction.creditsRequested,
      currency: transaction.currency,
      paymentMethod,
      currentBalance: currentCredits,
      newBalance: currentCredits + creditsRequested
    });
    
  } catch (error) {
    console.error('Credit purchase error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    );
  }
}
