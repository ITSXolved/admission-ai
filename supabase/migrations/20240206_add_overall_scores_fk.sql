-- Add foreign key relationship if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_student_overall_scores_exam_session'
    ) THEN 
        ALTER TABLE student_overall_scores
        ADD CONSTRAINT fk_student_overall_scores_exam_session
        FOREIGN KEY (exam_session_id)
        REFERENCES exam_sessions(id)
        ON DELETE CASCADE;
    END IF;
END $$;
