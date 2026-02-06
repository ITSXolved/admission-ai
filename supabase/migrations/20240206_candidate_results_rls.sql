-- Enable RLS on result tables if not already enabled
ALTER TABLE student_overall_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mcq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_written_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE written_evaluations ENABLE ROW LEVEL SECURITY;

-- 1. Policies for student_overall_scores
CREATE POLICY "Candidates can view their own scores"
    ON public.student_overall_scores FOR SELECT
    USING (
        student_id = auth.uid()
        AND public.get_user_role() = 'candidate'
    );

-- 2. Policies for student_mcq_responses
CREATE POLICY "Candidates can view their own MCQ responses"
    ON public.student_mcq_responses FOR SELECT
    USING (
        attempt_id IN (
            SELECT id FROM public.student_exam_attempts WHERE student_id = auth.uid()
        )
        AND public.get_user_role() = 'candidate'
    );

-- 3. Policies for student_written_responses
CREATE POLICY "Candidates can view their own written responses"
    ON public.student_written_responses FOR SELECT
    USING (
        attempt_id IN (
            SELECT id FROM public.student_exam_attempts WHERE student_id = auth.uid()
        )
        AND public.get_user_role() = 'candidate'
    );

-- 4. Policies for written_evaluations
-- Join to student_written_responses to check ownership
CREATE POLICY "Candidates can view evaluations of their responses"
    ON public.written_evaluations FOR SELECT
    USING (
        written_response_id IN (
            SELECT id FROM public.student_written_responses 
            WHERE attempt_id IN (
                SELECT id FROM public.student_exam_attempts WHERE student_id = auth.uid()
            )
        )
        AND public.get_user_role() = 'candidate'
    );
