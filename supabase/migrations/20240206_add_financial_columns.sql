-- Add financial columns to student_overall_scores
ALTER TABLE student_overall_scores
ADD COLUMN IF NOT EXISTS fee_agreed numeric,
ADD COLUMN IF NOT EXISTS payment_mode text CHECK (payment_mode IN ('full', 'installment')),
ADD COLUMN IF NOT EXISTS installments_count integer CHECK (installments_count IN (2, 3)),
ADD COLUMN IF NOT EXISTS residence_type text CHECK (residence_type IN ('hosteller', 'day_scholar'));

-- Note: installments_count should be null if payment_mode is 'full'
-- We can enforce this with a check constraint if desired, but flexible for now.
-- ALTER TABLE student_overall_scores ADD CONSTRAINT check_installments_mode CHECK (
--     (payment_mode = 'full' AND installments_count IS NULL) OR 
--     (payment_mode = 'installment' AND installments_count IS NOT NULL)
-- );
