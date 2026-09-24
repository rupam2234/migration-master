import pool from './db';
import { razorpay } from './razorpay';
import { calculateCreditPrice } from './payment-system';
import { releaseCouponReservation, reserveCoupon, type CouponQuote } from './coupon-service';

// Create a pending local transaction, create the Razorpay order, then attach
// its external ID. Neon HTTP queries are sessionless, so failure compensation
// is explicit rather than relying on a fake BEGIN/COMMIT sequence.
export async function createPaymentTransaction(
  userId: string,
  creditsRequested: number,
  paymentMethod: { id: string; type: string; provider: string },
  couponQuote?: CouponQuote,
) {
  if (creditsRequested < 1) throw new Error("Minimum 1 credit required");
  if (creditsRequested > 100000) throw new Error("Maximum 100,000 credits allowed per transaction");
  if (paymentMethod.provider !== "RAZORPAY") {
    throw new Error(`Unsupported payment provider: ${paymentMethod.provider}`);
  }

  const pricing = calculateCreditPrice(creditsRequested);
  const paymentCurrency = paymentMethod.id === "paypal" ? "USD" : "INR";
  const originalAmountUsd = pricing.totalUsd;
  const originalAmountInr = pricing.totalInr;
  const paymentAmount = couponQuote
    ? paymentCurrency === "USD" ? couponQuote.totalUsd : couponQuote.totalInr
    : paymentCurrency === "USD" ? originalAmountUsd : originalAmountInr;
  const discountAmountUsd = couponQuote?.discountUsd ?? 0;
  const discountAmountInr = couponQuote?.discountInr ?? 0;
  const isFree = couponQuote?.isFree ?? false;

  const transactionResult = await pool.query(
    `INSERT INTO payment_transactions
      (user_id, payment_method, payment_provider, credits_requested,
       amount_usd, amount_inr, currency, unit_price_usd, unit_price_inr, status,
       coupon_id, coupon_code, original_amount_usd, original_amount_inr,
       discount_amount_usd, discount_amount_inr, is_free)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      userId,
      paymentMethod.type,
      paymentMethod.provider,
      creditsRequested,
      originalAmountUsd,
      paymentAmount,
      paymentCurrency,
      pricing.breakdown[0]?.unit_price_usd ?? pricing.totalUsd,
      pricing.breakdown[0]?.unit_price_inr ?? pricing.totalInr,
      "PENDING",
      couponQuote?.couponId ?? null,
      couponQuote?.code ?? null,
      originalAmountUsd,
      originalAmountInr,
      discountAmountUsd,
      discountAmountInr,
      isFree,
    ],
  );
  const transaction = transactionResult[0];

  if (couponQuote) {
    try {
      await reserveCoupon(userId, String(transaction.id), couponQuote);
    } catch (error) {
      await pool.query(
        `UPDATE payment_transactions
         SET status = 'FAILED', failure_reason = $1, updated_at = NOW()
         WHERE id = $2 AND status = 'PENDING'`,
        [error instanceof Error ? error.message : "Coupon reservation failed", transaction.id],
      );
      throw error;
    }
  }

  if (isFree) {
    const freeResult = await pool.query(
      `WITH claimed AS (
         UPDATE payment_transactions
         SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING' AND is_free = TRUE
         RETURNING user_id, credits_requested, payment_method, payment_provider,
                   transaction_id, coupon_id, coupon_code
       ), coupon_completed AS (
         UPDATE credit_coupon_redemptions r
         SET status = 'COMPLETED', completed_at = NOW()
         FROM claimed
         WHERE r.transaction_id = $1 AND r.status = 'RESERVED'
         RETURNING r.id
       ), credited AS (
         INSERT INTO user_credit_balances (user_id, balance, currency, updated_at)
         SELECT user_id, credits_requested, 'credits', NOW() FROM claimed
         ON CONFLICT (user_id) DO UPDATE
         SET balance = user_credit_balances.balance + EXCLUDED.balance,
             updated_at = NOW()
         RETURNING user_id, balance
       )
       INSERT INTO credit_ledger
         (user_id, amount, type, reference, balance_after, description,
          payment_method, payment_provider, transaction_id, payment_status)
       SELECT credited.user_id, claimed.credits_requested, 'PURCHASE', $1,
              credited.balance, $2, claimed.payment_method,
              claimed.payment_provider, claimed.transaction_id, 'COMPLETED'
       FROM claimed JOIN credited ON credited.user_id = claimed.user_id
       RETURNING amount`,
      [String(transaction.id), `Free credit purchase: ${creditsRequested} credits`],
    );
    if (!freeResult[0]) throw new Error("Free credit transaction could not be completed.");
    return {
      id: transaction.id,
      transactionId: null,
      amountUsd: 0,
      amountInr: 0,
      originalAmountUsd,
      originalAmountInr,
      discountAmountUsd,
      discountAmountInr,
      creditsRequested,
      currency: paymentCurrency,
      paymentMethod,
      pricing,
      coupon: couponQuote,
      isFree: true,
    };
  }

  try {
    const order = await razorpay.orders.create({
      amount: paymentAmount,
      currency: paymentCurrency,
      // Razorpay limits receipts to 56 characters. A UUID user ID plus
      // timestamp can exceed that limit, so use the local numeric transaction
      // ID and keep the user ID in notes instead.
      receipt: `mm_${String(transaction.id)}_${Date.now()}`,
      notes: {
        credits_requested: creditsRequested.toString(),
        user_id: userId,
        transaction_id: String(transaction.id),
      },
    });

    await pool.query(
      `UPDATE payment_transactions
       SET transaction_id = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'PENDING'`,
      [order.id, transaction.id],
    );

    return {
      id: transaction.id,
      transactionId: order.id,
      amountUsd: paymentCurrency === "USD" ? paymentAmount : originalAmountUsd,
      amountInr: paymentCurrency === "INR" ? paymentAmount : originalAmountInr,
      originalAmountUsd,
      originalAmountInr,
      discountAmountUsd,
      discountAmountInr,
      creditsRequested,
      currency: paymentCurrency,
      paymentMethod,
      pricing,
      coupon: couponQuote,
      isFree: false,
    };
  } catch (error) {
    if (couponQuote) await releaseCouponReservation(String(transaction.id));
    await pool.query(
      `UPDATE payment_transactions
       SET status = 'FAILED', failure_reason = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'PENDING'`,
      [error instanceof Error ? error.message : "Razorpay order creation failed", transaction.id],
    );
    throw error;
  }
}