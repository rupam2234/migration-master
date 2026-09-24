import pool from "./db";
import { calculateCreditPrice } from "./payment-system";

export interface CouponQuote {
  code: string;
  couponId: number;
  discountPercent: number;
  credits: number;
  originalUsd: number;
  originalInr: number;
  discountUsd: number;
  discountInr: number;
  totalUsd: number;
  totalInr: number;
  isFree: boolean;
  expiresAt: string | null;
}

const MAX_COUPON_CODE_LENGTH = 64;
const RESERVATION_MINUTES = 30;

function normalizeCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function quoteFor(credits: number, code: string, couponId: number, discountPercent: number, expiresAt: string | null): CouponQuote {
  const pricing = calculateCreditPrice(credits);
  const discountUsd = Math.round((pricing.totalUsd * discountPercent) / 100);
  const discountInr = Math.round((pricing.totalInr * discountPercent) / 100);
  return {
    code,
    couponId,
    discountPercent,
    credits,
    originalUsd: pricing.totalUsd,
    originalInr: pricing.totalInr,
    discountUsd,
    discountInr,
    totalUsd: Math.max(0, pricing.totalUsd - discountUsd),
    totalInr: Math.max(0, pricing.totalInr - discountInr),
    isFree: discountPercent === 100,
    expiresAt,
  };
}

export async function getCouponQuote(userId: string, credits: number, rawCode: unknown): Promise<CouponQuote> {
  const code = normalizeCode(rawCode);
  if (!code || code.length > MAX_COUPON_CODE_LENGTH) throw new Error("Enter a valid discount code.");
  if (!Number.isInteger(credits) || credits < 1 || credits > 100000) throw new Error("Invalid credit amount.");

  const rows = await pool.query(
    `SELECT c.id, c.code, c.discount_percent, c.minimum_credits,
            c.max_redemptions, c.max_redemptions_per_user, c.expires_at,
            (SELECT COUNT(*) FROM credit_coupon_redemptions r
             WHERE r.coupon_id = c.id
               AND r.user_id = $1
               AND r.status IN ('RESERVED', 'COMPLETED')
               AND (r.status = 'COMPLETED' OR r.expires_at > NOW())) AS user_redemptions,
            (SELECT COUNT(*) FROM credit_coupon_redemptions r
             WHERE r.coupon_id = c.id
               AND r.status IN ('RESERVED', 'COMPLETED')
               AND (r.status = 'COMPLETED' OR r.expires_at > NOW())) AS total_redemptions
     FROM credit_coupons c
     WHERE c.code = $2
       AND (c.allowed_user_id IS NULL OR c.allowed_user_id = $1)
       AND c.is_active = TRUE
       AND c.starts_at <= NOW()
       AND (c.expires_at IS NULL OR c.expires_at > NOW())`,
    [userId, code],
  );
  const coupon = rows[0];
  if (!coupon) throw new Error("This discount code is invalid or expired.");
  if (credits < coupon.minimum_credits) throw new Error(`This code requires at least ${coupon.minimum_credits} credits.`);
  if (coupon.max_redemptions !== null && Number(coupon.total_redemptions) >= Number(coupon.max_redemptions)) throw new Error("This discount code has reached its usage limit.");
  if (coupon.max_redemptions_per_user !== null && Number(coupon.user_redemptions) >= Number(coupon.max_redemptions_per_user)) throw new Error("You have reached the usage limit for this discount code.");

  return quoteFor(credits, coupon.code, coupon.id, coupon.discount_percent, coupon.expires_at);
}

export async function reserveCoupon(
  userId: string,
  transactionId: string,
  quote: CouponQuote,
): Promise<void> {
  const result = await pool.query(
    `WITH locked AS (
       SELECT id FROM credit_coupons WHERE code = $1 FOR UPDATE
     ), eligible AS (
       SELECT c.id FROM credit_coupons c, locked
       WHERE c.id = locked.id
         AND (c.allowed_user_id IS NULL OR c.allowed_user_id = $3)
         AND c.is_active = TRUE
         AND c.starts_at <= NOW()
         AND (c.expires_at IS NULL OR c.expires_at > NOW())
         AND $2 >= c.minimum_credits
         AND (c.max_redemptions IS NULL OR (SELECT COUNT(*) FROM credit_coupon_redemptions r WHERE r.coupon_id = c.id AND r.status IN ('RESERVED', 'COMPLETED') AND (r.status = 'COMPLETED' OR r.expires_at > NOW())) < c.max_redemptions)
         AND (c.max_redemptions_per_user IS NULL OR (SELECT COUNT(*) FROM credit_coupon_redemptions r WHERE r.coupon_id = c.id AND r.user_id = $3 AND r.status IN ('RESERVED', 'COMPLETED') AND (r.status = 'COMPLETED' OR r.expires_at > NOW())) < c.max_redemptions_per_user)
     )
     INSERT INTO credit_coupon_redemptions
       (coupon_id, user_id, transaction_id, status, credits,
        original_amount_usd, original_amount_inr, discount_amount_usd, discount_amount_inr, expires_at)
     SELECT id, $3, $4, 'RESERVED', $5, $6, $7, $8, $9, NOW() + ($10 || ' minutes')::INTERVAL
     FROM eligible
     RETURNING id`,
    [quote.code, quote.credits, userId, transactionId, quote.credits, quote.originalUsd, quote.originalInr, quote.discountUsd, quote.discountInr, RESERVATION_MINUTES],
  );
  if (!result[0]) throw new Error("This discount code is no longer available.");
}

export async function releaseCouponReservation(transactionId: string): Promise<void> {
  await pool.query(
    `UPDATE credit_coupon_redemptions
     SET status = 'CANCELLED', cancelled_at = NOW()
     WHERE transaction_id = $1 AND status = 'RESERVED' AND expires_at > NOW()`,
    [transactionId],
  );
}

export async function completeCouponReservation(transactionId: string): Promise<void> {
  await pool.query(
    `UPDATE credit_coupon_redemptions
     SET status = 'COMPLETED', completed_at = NOW()
     WHERE transaction_id = $1 AND status = 'RESERVED'`,
    [transactionId],
  );
}
