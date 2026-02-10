-- Update RLS policies for child tables to match exam_sessions logic
-- Allow candidates to view sub-sessions, subjects, questions if the exam is active OR assigned to them

-- 1. exam_sub_sessions
DROP POLICY IF EXISTS "Candidates can view active sub-sessions" ON public.exam_sub_sessions;

CREATE POLICY "Candidates can view active or assigned sub-sessions"
ON public.exam_sub_sessions
FOR SELECT
USING (
  exam_session_id IN (
    SELECT id FROM public.exam_sessions 
    WHERE is_active = true 
    OR id IN (
      SELECT exam_session_id 
      FROM public.student_exam_attempts 
      WHERE student_id IN (
        SELECT admission_enquiry_id 
        FROM public.user_credentials 
        WHERE user_id = auth.uid()
      )
    )
  )
  AND public.get_user_role() = 'candidate'
);

-- 2. exam_subjects
DROP POLICY IF EXISTS "Candidates can view subjects of active exams" ON public.exam_subjects;

CREATE POLICY "Candidates can view subjects of active or assigned exams"
ON public.exam_subjects
FOR SELECT
USING (
  sub_session_id IN (
    SELECT id FROM public.exam_sub_sessions 
    WHERE exam_session_id IN (
      SELECT id FROM public.exam_sessions 
      WHERE is_active = true 
      OR id IN (
        SELECT exam_session_id 
        FROM public.student_exam_attempts 
        WHERE student_id IN (
          SELECT admission_enquiry_id 
          FROM public.user_credentials 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  AND public.get_user_role() = 'candidate'
);

-- 3. exam_questions
DROP POLICY IF EXISTS "Candidates can view questions of active exams" ON public.exam_questions;

CREATE POLICY "Candidates can view questions of active or assigned exams"
ON public.exam_questions
FOR SELECT
USING (
  sub_session_id IN (
    SELECT id FROM public.exam_sub_sessions 
    WHERE exam_session_id IN (
      SELECT id FROM public.exam_sessions 
      WHERE is_active = true 
      OR id IN (
        SELECT exam_session_id 
        FROM public.student_exam_attempts 
        WHERE student_id IN (
          SELECT admission_enquiry_id 
          FROM public.user_credentials 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  AND public.get_user_role() = 'candidate'
);

-- 4. question_bank
DROP POLICY IF EXISTS "Candidates can view question details" ON public.question_bank;

CREATE POLICY "Candidates can view question details of active or assigned exams"
ON public.question_bank
FOR SELECT
USING (
  id IN (
    SELECT question_bank_id FROM public.exam_questions WHERE sub_session_id IN (
      SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
        SELECT id FROM public.exam_sessions WHERE is_active = true
        OR id IN (
          SELECT exam_session_id 
          FROM public.student_exam_attempts 
          WHERE student_id IN (
            SELECT admission_enquiry_id 
            FROM public.user_credentials 
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  )
  AND public.get_user_role() = 'candidate'
);

-- 5. cognitive_test_configs
DROP POLICY IF EXISTS "Candidates can view cognitive test configs" ON public.cognitive_test_configs;

CREATE POLICY "Candidates can view cognitive test configs of active or assigned exams"
ON public.cognitive_test_configs
FOR SELECT
USING (
  sub_session_id IN (
    SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
      SELECT id FROM public.exam_sessions WHERE is_active = true
      OR id IN (
        SELECT exam_session_id 
        FROM public.student_exam_attempts 
        WHERE student_id IN (
          SELECT admission_enquiry_id 
          FROM public.user_credentials 
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  AND public.get_user_role() = 'candidate'
);
