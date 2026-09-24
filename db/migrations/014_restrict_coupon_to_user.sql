-- 014_restrict_coupon_to_user.sql
-- Optional account-level restriction for private/free-test coupons.
-- NULL keeps a coupon available to any eligible account.

ALTER TABLE credit_coupons
  ADD COLUMN IF NOT EXISTS allowed_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_credit_coupons_allowed_user
  ON credit_coupons (allowed_user_id)
  WHERE allowed_user_id IS NOT NULL;
