-- Add unique constraint to written_evaluations table for upsert capability
-- This is required to make ON CONFLICT (written_response_id) work
ALTER TABLE written_evaluations
ADD CONSTRAINT written_evaluations_written_response_id_key UNIQUE (written_response_id);
