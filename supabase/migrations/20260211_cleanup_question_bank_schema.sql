-- Migration to cleanup check_bank schema
-- 1. Transfer values from 'type' to 'question_type' if 'question_type' is null
-- 2. Transfer values from 'difficulty' to 'difficulty_level' if 'difficulty_level' is null
-- 3. Drop 'type' and 'difficulty' columns

-- Safe update for question_type
UPDATE public.question_bank
SET question_type = type::text::public.session_type -- Cast to expected enum or text
WHERE question_type IS NULL AND type IS NOT NULL;

-- Safe update for difficulty_level
UPDATE public.question_bank
SET difficulty_level = difficulty
WHERE difficulty_level IS NULL AND difficulty IS NOT NULL;

-- Drop redundant columns
ALTER TABLE public.question_bank 
DROP COLUMN IF EXISTS type,
DROP COLUMN IF EXISTS difficulty;
