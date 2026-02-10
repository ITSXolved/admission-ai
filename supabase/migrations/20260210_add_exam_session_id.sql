-- Add exam_session_id to question_bank to scope questions to specific exams
ALTER TABLE public.question_bank 
ADD COLUMN IF NOT EXISTS exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_question_bank_exam_session ON public.question_bank(exam_session_id);

-- Update RLS policies to check exam_session_id if needed (optional for now as we trust the controller)

-- Set default exam_session_id for existing questions to "Admission Test 1"
UPDATE public.question_bank
SET exam_session_id = '8fdb8a6c-e43d-4b4b-b6a0-d54087c819a4'
WHERE exam_session_id IS NULL;
