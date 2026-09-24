import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib';
import { getUserCreditBalance, getUserPaymentHistory } from '@/lib/payment-utils';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const [balance, paymentHistory] = await Promise.all([
      getUserCreditBalance(user.id),
      getUserPaymentHistory(user.id, 20),
    ]);

    return NextResponse.json({
      success: true,
      balance,
      currency: 'credits',
      paymentHistory,
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balance' },
      { status: 500 },
    );
  }
}