-- 015_percentage_coupon_minimum.sql
-- Percentage coupons apply to the selected credit amount. The private
-- 100% coupon below may therefore be used for any positive amount.

UPDATE credit_coupons
SET minimum_credits = 1,
    updated_at = NOW()
WHERE code = 'FREE100-TZ80QZ'
  AND discount_percent = 100;
