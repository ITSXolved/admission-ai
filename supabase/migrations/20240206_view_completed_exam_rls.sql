-- Allow candidates to view exam content (questions, subjects) for their COMPLETED attempts
-- The previous policies only checked for 'is_active = true'. 
-- These additional policies allow access if the user has a valid attempt record (e.g. completed exam).

-- 1. Sub-sessions
CREATE POLICY "Candidates can view sub-sessions of attempts"
  ON public.exam_sub_sessions FOR SELECT
  USING (
    exam_session_id IN (
        SELECT exam_session_id FROM public.student_exam_attempts 
        WHERE student_id = auth.uid()
    )
    AND public.get_user_role() = 'candidate'
  );

-- 2. Subjects
CREATE POLICY "Candidates can view subjects of attempts"
  ON public.exam_subjects FOR SELECT
  USING (
    sub_session_id IN (
        SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
            SELECT exam_session_id FROM public.student_exam_attempts 
            WHERE student_id = auth.uid()
        )
    )
    AND public.get_user_role() = 'candidate'
  );

-- 3. Questions
CREATE POLICY "Candidates can view questions of attempts"
  ON public.exam_questions FOR SELECT
  USING (
    sub_session_id IN (
        SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
            SELECT exam_session_id FROM public.student_exam_attempts 
            WHERE student_id = auth.uid()
        )
    )
    AND public.get_user_role() = 'candidate'
  );

-- 4. Question Bank
CREATE POLICY "Candidates can view question bank of attempts"
  ON public.question_bank FOR SELECT
  USING (
    id IN (
        SELECT question_bank_id FROM public.exam_questions WHERE sub_session_id IN (
            SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
                SELECT exam_session_id FROM public.student_exam_attempts 
                WHERE student_id = auth.uid()
            )
        )
    )
    AND public.get_user_role() = 'candidate'
  );
