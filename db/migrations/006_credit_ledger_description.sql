-- 006_credit_ledger_description.sql — add description column to credit_ledger
-- Idempotent — safe to re-run.

-- Add description column to credit_ledger for better transaction tracking
ALTER TABLE credit_ledger 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records with default descriptions
UPDATE credit_ledger 
SET description = CASE 
    WHEN type = 'PURCHASE' THEN 'Credit purchase'
    WHEN type = 'EXPORT' THEN 'Credit deduction for export'
    WHEN type = 'REFUND' THEN 'Credit refund'
    WHEN type = 'ADMIN' THEN 'Administrative credit adjustment'
    ELSE 'Credit transaction'
END 
WHERE description IS NULL;
