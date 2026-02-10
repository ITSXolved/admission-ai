-- Update RLS policy for exam_sessions to allow candidates to view assigned exams even if inactive

DROP POLICY IF EXISTS "Candidates can view active exams" ON public.exam_sessions;

CREATE POLICY "Candidates can view active or assigned exams"
ON public.exam_sessions
FOR SELECT
USING (
  (is_active = true AND public.get_user_role() = 'candidate')
  OR
  (
    id IN (
      SELECT exam_session_id 
      FROM public.student_exam_attempts 
      WHERE student_id IN (
        SELECT admission_enquiry_id 
        FROM public.user_credentials 
        WHERE user_id = auth.uid()
      )
    )
  )
);
