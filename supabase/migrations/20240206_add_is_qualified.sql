ALTER TABLE student_overall_scores
ADD COLUMN IF NOT EXISTS is_qualified boolean DEFAULT false;
