import pool from './db';

// Get user's credit balance
export async function getUserCreditBalance(userId: string): Promise<number> {
  const rows = await pool.query(
    'SELECT balance FROM user_credit_balances WHERE user_id = $1',
    [userId]
  );
  
  return rows[0]?.balance || 0;
}

// Get user's payment history
export async function getUserPaymentHistory(userId: string, limit: number = 50): Promise<any[]> {
  const rows = await pool.query(
    `SELECT pt.*, cl.balance_after
     FROM payment_transactions pt
     LEFT JOIN credit_ledger cl
       ON pt.id::TEXT = cl.reference
      AND cl.type = 'PURCHASE'
     WHERE pt.user_id = $1
     ORDER BY pt.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return rows;
}

// Get transaction details by ID
export async function getTransactionDetails(transactionId: string): Promise<any> {
  const rows = await pool.query(
    'SELECT * FROM payment_transactions WHERE id = $1',
    [transactionId]
  );
  
  return rows[0] || null;
}

// Check if user has sufficient credits for export
export async function hasSufficientCredits(userId: string, requiredCredits: number): Promise<{ hasEnough: boolean; currentBalance: number }> {
  const balance = await getUserCreditBalance(userId);
  return {
    hasEnough: balance >= requiredCredits,
    currentBalance: balance
  };
}

// Deduct credits and write the ledger in one atomic SQL statement. Neon HTTP
// queries are sessionless, so standalone BEGIN/COMMIT calls are not atomic.
export async function deductCreditsForExport(
  userId: string,
  exportJobId: string,
  requiredCredits: number,
): Promise<{ success: boolean; newBalance: number }> {
  const current = await getUserCreditBalance(userId);
  if (current < requiredCredits) {
    return { success: false, newBalance: current };
  }

  const result = await pool.query(
    `WITH deducted AS (
       UPDATE user_credit_balances
       SET balance = balance - $1, updated_at = NOW()
       WHERE user_id = $2 AND balance >= $1
       RETURNING balance
     )
     INSERT INTO credit_ledger
       (user_id, amount, type, reference, balance_after, description,
        payment_method, payment_provider, transaction_id, payment_status)
     SELECT $2, $1, 'EXPORT', $3, deducted.balance,
            $4, NULL, NULL, NULL, 'COMPLETED'
     FROM deducted
     RETURNING balance_after`,
    [
      requiredCredits,
      userId,
      exportJobId,
      `Credit deduction for export: ${requiredCredits} credits`,
    ],
  );

  if (!result[0]) {
    return { success: false, newBalance: await getUserCreditBalance(userId) };
  }

  return { success: true, newBalance: Number(result[0].balance_after) };
}