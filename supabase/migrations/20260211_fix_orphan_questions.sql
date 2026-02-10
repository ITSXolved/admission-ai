-- Fix orphan questions: Link questions assigned to exam_session_id to the correct sub_session

DO $$
DECLARE
    r RECORD;
    target_sub_session_id UUID;
BEGIN
    -- Iterate through questions that have an exam_session_id but are NOT in exam_questions
    FOR r IN 
        SELECT q.id, q.question_type, q.exam_session_id, q.marks
        FROM public.question_bank q
        WHERE q.exam_session_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_questions eq 
            WHERE eq.question_bank_id = q.id
        )
    LOOP
        -- Find the matching sub-session for this exam session and question type
        -- Note: We map 'mcq' to 'mcq', 'written' to 'written', etc.
        -- We assume there is only one sub-session of each type per exam session (which is typical for this app)
        SELECT id INTO target_sub_session_id
        FROM public.exam_sub_sessions
        WHERE exam_session_id = r.exam_session_id
        AND session_type::text = r.question_type::text;

        -- Fallback for cognitive or other types if exact match fails?
        -- For now, strict matching.

        IF target_sub_session_id IS NOT NULL THEN
            INSERT INTO public.exam_questions (question_bank_id, sub_session_id, marks)
            VALUES (r.id, target_sub_session_id, r.marks);
            
            RAISE NOTICE 'Linked Question % (Type: %) to SubSession %', r.id, r.question_type, target_sub_session_id;
        ELSE
            RAISE WARNING 'Could not find SubSession for Question % (Type: %) in Session %', r.id, r.question_type, r.exam_session_id;
        END IF;

    END LOOP;
END $$;
