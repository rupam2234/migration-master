-- 009_seed_user_credit_balances.sql
-- Ensure every existing account has a canonical balance row. New users can
-- still start at zero through the same primary-key/upsert model.

INSERT INTO user_credit_balances (user_id, balance, currency, updated_at)
SELECT id, 0, 'credits', NOW()
FROM users
ON CONFLICT (user_id) DO NOTHING;
