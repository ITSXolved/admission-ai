-- Add remarks column to student_overall_scores
ALTER TABLE public.student_overall_scores
ADD COLUMN IF NOT EXISTS remarks text;
