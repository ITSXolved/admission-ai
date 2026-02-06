-- Add columns to student_overall_scores table for detailed scoring
ALTER TABLE student_overall_scores 
ADD COLUMN IF NOT EXISTS total_possible_marks numeric,
ADD COLUMN IF NOT EXISTS percentage_score numeric,
ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}'::jsonb;
