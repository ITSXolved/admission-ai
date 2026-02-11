
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opyuiplvavwsjbyofbbk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weXVpcGx2YXZ3c2pieW9mYmJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2Mjk3MiwiZXhwIjoyMDgzOTM4OTcyfQ.5c1k-gf4f1nxB1IsX5Ci9mw2YcWVkGwnmKGRYBsjN_A';

const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_ID = 'e0d2d399-2bf0-40b1-8667-72db3e0f0390';

async function fixOrphans() {
    console.log(`Fixing Orphans for Exam ID: ${EXAM_ID}`);

    // 1. Get Sub Sessions to map types
    const { data: subSessions, error: subError } = await supabase
        .from('exam_sub_sessions')
        .select('id, session_type')
        .eq('exam_session_id', EXAM_ID);

    if (subError) { console.error('SubSession Error:', subError); return; }

    // Create a map: type -> id
    const subSessionMap = {};
    subSessions.forEach(s => {
        subSessionMap[s.session_type] = s.id;
    });
    console.log('SubSession Map:', subSessionMap);

    // 2. Get All Questions in Question Bank for this Exam
    // Note: We need to check if they are already in exam_questions
    const { data: allQuestions, error: qError } = await supabase
        .from('question_bank')
        .select('id, question_type, marks, exam_session_id')
        .eq('exam_session_id', EXAM_ID);

    if (qError) { console.error('Question Fetch Error:', qError); return; }
    console.log(`Fetch ${allQuestions.length} questions associated with this exam session.`);

    // 3. Check which ones are already linked
    let fixedCount = 0;
    let errorCount = 0;

    for (const q of allQuestions) {
        // Check if linked
        const { data: links, error: linkCheckError } = await supabase
            .from('exam_questions')
            .select('id')
            .eq('question_bank_id', q.id);

        if (linkCheckError) {
            console.error(`Error checking link for Q ${q.id}:`, linkCheckError);
            continue;
        }

        if (links && links.length > 0) {
            // Already linked, skip
            continue;
        }

        // Not linked! Need to link.
        const targetSubSessionId = subSessionMap[q.question_type];
        if (!targetSubSessionId) {
            console.warn(`No matching sub-session found for question ${q.id} with type ${q.question_type}`);
            continue;
        }

        console.log(`Linking Question ${q.id} (${q.question_type}) to SubSession ${targetSubSessionId}`);

        const { error: insertError } = await supabase
            .from('exam_questions')
            .insert([{
                question_bank_id: q.id,
                sub_session_id: targetSubSessionId,
                marks: q.marks || 1
                // subject_id is optional/null for direct questions
            }]);

        if (insertError) {
            console.error(`Error inserting link for Q ${q.id}:`, insertError);
            errorCount++;
        } else {
            fixedCount++;
        }
    }

    console.log(`\nOperation Complete.`);
    console.log(`Fixed (Linked): ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);
}

fixOrphans();
