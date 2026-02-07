-- Add exam_scheduled_datetime column to student_exam_attempts table
-- This allows exam controllers to schedule specific date/time for each candidate's exam

ALTER TABLE student_exam_attempts
ADD COLUMN IF NOT EXISTS exam_scheduled_datetime TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN student_exam_attempts.exam_scheduled_datetime IS 'Scheduled date and time for the candidate to take the exam';
