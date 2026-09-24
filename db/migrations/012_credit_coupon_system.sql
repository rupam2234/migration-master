-- 012_credit_coupon_system.sql
-- Server-authoritative coupons for the unified credit purchase flow.
-- Amounts are stored in the same minor units used by Razorpay.

CREATE TABLE IF NOT EXISTS credit_coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  minimum_credits INTEGER NOT NULL DEFAULT 1 CHECK (minimum_credits >= 1),
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  max_redemptions_per_user INTEGER CHECK (max_redemptions_per_user IS NULL OR max_redemptions_per_user > 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_credit_coupons_active
  ON credit_coupons (is_active, starts_at, expires_at);

CREATE TABLE IF NOT EXISTS credit_coupon_redemptions (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES credit_coupons(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id BIGINT REFERENCES payment_transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'RESERVED'
    CHECK (status IN ('RESERVED', 'COMPLETED', 'CANCELLED')),
  credits INTEGER NOT NULL CHECK (credits > 0),
  original_amount_usd INTEGER NOT NULL,
  original_amount_inr INTEGER NOT NULL,
  discount_amount_usd INTEGER NOT NULL CHECK (discount_amount_usd >= 0),
  discount_amount_inr INTEGER NOT NULL CHECK (discount_amount_inr >= 0),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_coupon_redemptions_coupon_status
  ON credit_coupon_redemptions (coupon_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_credit_coupon_redemptions_user_status
  ON credit_coupon_redemptions (user_id, status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_coupon_reservation_transaction
  ON credit_coupon_redemptions (transaction_id)
  WHERE transaction_id IS NOT NULL;

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS coupon_id BIGINT REFERENCES credit_coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS original_amount_usd INTEGER,
  ADD COLUMN IF NOT EXISTS original_amount_inr INTEGER,
  ADD COLUMN IF NOT EXISTS discount_amount_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount_inr INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_coupon
  ON payment_transactions (coupon_id, created_at DESC);
