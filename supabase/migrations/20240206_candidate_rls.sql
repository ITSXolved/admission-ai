-- Allow candidates to view structure of active exams (sessions, sub-sessions, subjects)
-- We join back to exam_sessions to ensure the exam is active and they are a candidate

-- 1. Exam Sub-Sessions
CREATE POLICY "Candidates can view active sub-sessions"
  ON public.exam_sub_sessions FOR SELECT
  USING (
    exam_session_id IN (
      SELECT id FROM public.exam_sessions WHERE is_active = true
    )
    AND public.get_user_role() = 'candidate'
  );

-- 2. Exam Subjects
CREATE POLICY "Candidates can view subjects of active exams"
  ON public.exam_subjects FOR SELECT
  USING (
    sub_session_id IN (
      SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
        SELECT id FROM public.exam_sessions WHERE is_active = true
      )
    )
    AND public.get_user_role() = 'candidate'
  );

-- 3. Exam Questions
CREATE POLICY "Candidates can view questions of active exams"
  ON public.exam_questions FOR SELECT
  USING (
    sub_session_id IN (
      SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
        SELECT id FROM public.exam_sessions WHERE is_active = true
      )
    )
    AND public.get_user_role() = 'candidate'
  );

-- 4. Question Bank (Access to actual question text)
-- Only allow questions that are linked to active exam questions
CREATE POLICY "Candidates can view question details"
  ON public.question_bank FOR SELECT
  USING (
    id IN (
      SELECT question_bank_id FROM public.exam_questions WHERE sub_session_id IN (
        SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
          SELECT id FROM public.exam_sessions WHERE is_active = true
        )
      )
    )
    AND public.get_user_role() = 'candidate'
  );

-- 5. Cognitive Test Configs
CREATE POLICY "Candidates can view cognitive test configs"
  ON public.cognitive_test_configs FOR SELECT
  USING (
    sub_session_id IN (
      SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
        SELECT id FROM public.exam_sessions WHERE is_active = true
      )
    )
    AND public.get_user_role() = 'candidate'
  );
