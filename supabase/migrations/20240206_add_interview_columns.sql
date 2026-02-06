-- Add interview related columns to student_overall_scores
ALTER TABLE student_overall_scores
ADD COLUMN IF NOT EXISTS interview_score numeric,
ADD COLUMN IF NOT EXISTS interview_status text DEFAULT 'pending', -- pending, scheduled, completed
ADD COLUMN IF NOT EXISTS interview_date timestamptz;

-- Ensure constraint for status check if desired (optional but good practice)
-- ALTER TABLE student_overall_scores ADD CONSTRAINT check_interview_status CHECK (interview_status IN ('pending', 'scheduled', 'completed'));
