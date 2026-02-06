-- Drop existing constraint
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_subject_id_fkey;

-- Re-add constraint with ON DELETE CASCADE
ALTER TABLE question_bank 
ADD CONSTRAINT question_bank_subject_id_fkey 
FOREIGN KEY (subject_id) 
REFERENCES exam_subjects(id) 
ON DELETE CASCADE;
