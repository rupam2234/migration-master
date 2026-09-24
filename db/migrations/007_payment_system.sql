-- 007_payment_system_minimal.sql — minimal payment system migration
-- Idempotent — safe to re-run.

-- Add payment method tracking to credit ledger
ALTER TABLE credit_ledger 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';

-- Add user location detection
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS is_indian BOOLEAN DEFAULT FALSE;

-- Add payment transaction tracking table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'CARD', 'PAYPAL')),
    payment_provider TEXT NOT NULL CHECK (payment_provider IN ('RAZORPAY', 'PAYPAL')),
    credits_requested INTEGER NOT NULL,
    amount_usd INTEGER NOT NULL, -- amount in cents
    amount_inr INTEGER NOT NULL, -- amount in paise
    currency TEXT NOT NULL DEFAULT 'USD',
    unit_price_usd INTEGER NOT NULL, -- unit price in cents
    unit_price_inr INTEGER NOT NULL, -- unit price in paise
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    failure_reason TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user 
    ON payment_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
    ON payment_transactions (status, created_at DESC);
