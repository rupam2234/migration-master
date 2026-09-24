import crypto from "crypto";
import pool from "./db";

interface RazorpayPaymentData {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export async function verifyPaymentTransaction(
  transactionId: string,
  paymentData: RazorpayPaymentData,
  userId?: string,
): Promise<{ success: boolean; creditsAdded: number }> {
  const transactionRows = await pool.query(
    userId
      ? "SELECT * FROM payment_transactions WHERE id = $1 AND user_id = $2"
      : "SELECT * FROM payment_transactions WHERE id = $1",
    userId ? [transactionId, userId] : [transactionId],
  );
  const transaction = transactionRows[0];

  if (!transaction) throw new Error("Transaction not found");

  if (transaction.status === "COMPLETED") {
    return { success: true, creditsAdded: transaction.credits_requested };
  }
  if (transaction.status !== "PENDING") {
    return { success: false, creditsAdded: 0 };
  }
  if (transaction.payment_provider !== "RAZORPAY") {
    throw new Error(`Unsupported payment provider: ${transaction.payment_provider}`);
  }
  if (paymentData.razorpay_order_id !== transaction.transaction_id) {
    throw new Error("Razorpay order ID does not match the transaction");
  }

  const secret = process.env.RAZORPAY_SECRET;
  if (!secret) throw new Error("Razorpay secret is not configured");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${transaction.transaction_id}|${paymentData.razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== paymentData.razorpay_signature) {
    await handlePaymentFailure(transactionId, "Payment signature verification failed");
    return { success: false, creditsAdded: 0 };
  }

  // Claiming the PENDING row in the same statement as the balance upsert and
  // ledger insert makes completion atomic and safe against duplicate callbacks.
  const completed = await pool.query(
    `WITH claimed AS (
       UPDATE payment_transactions
       SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING' AND transaction_id = $2
       RETURNING user_id, credits_requested, payment_method,
                 payment_provider, transaction_id
     ), coupon_completed AS (
       UPDATE credit_coupon_redemptions r
       SET status = 'COMPLETED', completed_at = NOW()
       FROM claimed
       WHERE r.transaction_id = $1 AND r.status = 'RESERVED'
       RETURNING r.id
     ), credited AS (
       INSERT INTO user_credit_balances
         (user_id, balance, currency, updated_at)
       SELECT user_id, credits_requested, 'credits', NOW()
       FROM claimed
       ON CONFLICT (user_id) DO UPDATE
       SET balance = user_credit_balances.balance + EXCLUDED.balance,
           updated_at = NOW()
       RETURNING user_id, balance
     )
     INSERT INTO credit_ledger
       (user_id, amount, type, reference, balance_after, description,
        payment_method, payment_provider, transaction_id, payment_status)
     SELECT credited.user_id, claimed.credits_requested, 'PURCHASE', $1,
            credited.balance, $3, claimed.payment_method,
            claimed.payment_provider, claimed.transaction_id, 'COMPLETED'
     FROM claimed
     JOIN credited ON credited.user_id = claimed.user_id
     RETURNING amount`,
    [
      transactionId,
      paymentData.razorpay_order_id,
      `Credit purchase: ${transaction.credits_requested} credits`,
    ],
  );

  if (completed[0]) {
    return { success: true, creditsAdded: transaction.credits_requested };
  }

  // Another callback may have completed it between the initial read and claim.
  const current = await pool.query(
    "SELECT status, credits_requested FROM payment_transactions WHERE id = $1",
    [transactionId],
  );
  return current[0]?.status === "COMPLETED"
    ? { success: true, creditsAdded: current[0].credits_requested }
    : { success: false, creditsAdded: 0 };
}

export async function handlePaymentFailure(
  transactionId: string,
  failureReason: string,
): Promise<void> {
  await pool.query(
    `UPDATE payment_transactions
     SET status = 'FAILED', failure_reason = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'PENDING'`,
    [failureReason, transactionId],
  );
}
