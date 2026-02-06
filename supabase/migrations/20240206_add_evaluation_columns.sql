-- Add missing columns to written_evaluations table
ALTER TABLE written_evaluations 
ADD COLUMN IF NOT EXISTS evaluator_type text DEFAULT 'ai',
ADD COLUMN IF NOT EXISTS content_relevance_score numeric,
ADD COLUMN IF NOT EXISTS grammar_score numeric,
ADD COLUMN IF NOT EXISTS vocabulary_score numeric,
ADD COLUMN IF NOT EXISTS coherence_score numeric,
ADD COLUMN IF NOT EXISTS legibility_score numeric,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'English';
