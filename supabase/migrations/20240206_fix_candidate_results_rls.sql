-- Fix RLS policies for candidate results AND exam content access
-- The previous policies assumed student_id = auth.uid(), but student_id refers to admission_enquiries.id
-- We need to map auth.uid() -> admission_enquiry_id via user_credentials

-- ============================================================================
-- 1. RESULT TABLES
-- ============================================================================

DROP POLICY IF EXISTS "Candidates can view their own scores" ON public.student_overall_scores;
DROP POLICY IF EXISTS "Candidates can view their own MCQ responses" ON public.student_mcq_responses;
DROP POLICY IF EXISTS "Candidates can view their own written responses" ON public.student_written_responses;
DROP POLICY IF EXISTS "Candidates can view evaluations of their responses" ON public.written_evaluations;

CREATE POLICY "Candidates can view their own scores"
    ON public.student_overall_scores FOR SELECT
    USING (
        student_id IN (
            SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
        )
        AND public.get_user_role() = 'candidate'
    );

CREATE POLICY "Candidates can view their own MCQ responses"
    ON public.student_mcq_responses FOR SELECT
    USING (
        attempt_id IN (
            SELECT id FROM public.student_exam_attempts WHERE student_id IN (
                 SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
            )
        )
        AND public.get_user_role() = 'candidate'
    );

CREATE POLICY "Candidates can view their own written responses"
    ON public.student_written_responses FOR SELECT
    USING (
        attempt_id IN (
            SELECT id FROM public.student_exam_attempts WHERE student_id IN (
                 SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
            )
        )
        AND public.get_user_role() = 'candidate'
    );

CREATE POLICY "Candidates can view evaluations of their responses"
    ON public.written_evaluations FOR SELECT
    USING (
        written_response_id IN (
            SELECT id FROM public.student_written_responses 
            WHERE attempt_id IN (
                SELECT id FROM public.student_exam_attempts WHERE student_id IN (
                     SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
                )
            )
        )
        AND public.get_user_role() = 'candidate'
    );

-- ============================================================================
-- 2. EXAM CONTENT (Questions, details for completed exams)
-- ============================================================================

DROP POLICY IF EXISTS "Candidates can view sub-sessions of attempts" ON public.exam_sub_sessions;
DROP POLICY IF EXISTS "Candidates can view subjects of attempts" ON public.exam_subjects;
DROP POLICY IF EXISTS "Candidates can view questions of attempts" ON public.exam_questions;
DROP POLICY IF EXISTS "Candidates can view question bank of attempts" ON public.question_bank;

-- Sub-sessions
CREATE POLICY "Candidates can view sub-sessions of attempts"
  ON public.exam_sub_sessions FOR SELECT
  USING (
    exam_session_id IN (
        SELECT exam_session_id FROM public.student_exam_attempts 
        WHERE student_id IN (
            SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
        )
    )
    AND public.get_user_role() = 'candidate'
  );

-- Subjects
CREATE POLICY "Candidates can view subjects of attempts"
  ON public.exam_subjects FOR SELECT
  USING (
    sub_session_id IN (
        SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
            SELECT exam_session_id FROM public.student_exam_attempts 
            WHERE student_id IN (
                SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
            )
        )
    )
    AND public.get_user_role() = 'candidate'
  );

-- Questions
CREATE POLICY "Candidates can view questions of attempts"
  ON public.exam_questions FOR SELECT
  USING (
    sub_session_id IN (
        SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
            SELECT exam_session_id FROM public.student_exam_attempts 
            WHERE student_id IN (
                SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
            )
        )
    )
    AND public.get_user_role() = 'candidate'
  );

-- Question Bank
CREATE POLICY "Candidates can view question bank of attempts"
  ON public.question_bank FOR SELECT
  USING (
    id IN (
        SELECT question_bank_id FROM public.exam_questions WHERE sub_session_id IN (
            SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
                SELECT exam_session_id FROM public.student_exam_attempts 
                WHERE student_id IN (
                    SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
                )
            )
        )
    )
    AND public.get_user_role() = 'candidate'
  );
