-- Trigger to sync interview_status from student_overall_scores to admission_enquiries
-- Maps interview statuses to student_status enum

CREATE OR REPLACE FUNCTION public.sync_interview_status_to_enquiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if interview_status has changed
  IF OLD.interview_status IS DISTINCT FROM NEW.interview_status THEN
    
    UPDATE public.admission_enquiries
    SET overall_status = CASE 
      WHEN NEW.interview_status = 'scheduled' THEN 'called_for_interview'::student_status
      WHEN NEW.interview_status = 'waiting_list' THEN 'waiting_list'::student_status
      WHEN NEW.interview_status = 'rejected' THEN 'rejected'::student_status
      WHEN NEW.interview_status = 'qualified' THEN 'qualified'::student_status
      WHEN NEW.interview_status = 'completed' THEN 'qualified'::student_status -- Default fallback or logic
      ELSE overall_status -- Keep existing if no match
    END
    WHERE id = NEW.student_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_interview_status ON public.student_overall_scores;

CREATE TRIGGER trigger_sync_interview_status
  AFTER UPDATE OF interview_status ON public.student_overall_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_interview_status_to_enquiry();
