-- Backfill existing records to sync interview_status to overall_status

UPDATE public.admission_enquiries ae
SET overall_status = CASE 
  WHEN sos.interview_status = 'scheduled' THEN 'called_for_interview'::student_status
  WHEN sos.interview_status = 'waiting_list' THEN 'waiting_list'::student_status
  WHEN sos.interview_status = 'rejected' THEN 'rejected'::student_status
  WHEN sos.interview_status = 'qualified' THEN 'qualified'::student_status
  ELSE ae.overall_status
END
FROM public.student_overall_scores sos
WHERE ae.id = sos.student_id
AND sos.interview_status IS NOT NULL
AND ae.overall_status != CASE 
  WHEN sos.interview_status = 'scheduled' THEN 'called_for_interview'::student_status
  WHEN sos.interview_status = 'waiting_list' THEN 'waiting_list'::student_status
  WHEN sos.interview_status = 'rejected' THEN 'rejected'::student_status
  WHEN sos.interview_status = 'qualified' THEN 'qualified'::student_status
  ELSE ae.overall_status
END;
