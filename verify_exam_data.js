
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opyuiplvavwsjbyofbbk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weXVpcGx2YXZ3c2pieW9mYmJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2Mjk3MiwiZXhwIjoyMDgzOTM4OTcyfQ.5c1k-gf4f1nxB1IsX5Ci9mw2YcWVkGwnmKGRYBsjN_A';

const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_ID = 'e0d2d399-2bf0-40b1-8667-72db3e0f0390';

async function checkExam() {
    console.log(`Checking Exam ID: ${EXAM_ID}`);

    // 1. Get Exam Session
    const { data: session, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('id, name, is_active')
        .eq('id', EXAM_ID)
        .single();

    if (sessionError) { console.error('Session Error:', sessionError); return; }
    console.log('Exam Session:', session);

    // 2. Get Sub Sessions
    const { data: subSessions, error: subError } = await supabase
        .from('exam_sub_sessions')
        .select('id, name, session_type, sequence_order')
        .eq('exam_session_id', EXAM_ID)
        .order('sequence_order');

    if (subError) { console.error('SubSession Error:', subError); return; }
    console.log(`\nFound ${subSessions.length} Sub-Sessions`);

    for (const sub of subSessions) {
        console.log(`\n[Sub-Session] ${sub.name} (${sub.id})`);

        // 3. Get Subjects for this Sub-Session
        const { data: subjects, error: subjError } = await supabase
            .from('exam_subjects')
            .select('id, name')
            .eq('sub_session_id', sub.id);

        if (subjError) console.error('Subject Error:', subjError);

        if (subjects && subjects.length > 0) {
            console.log(`  Subjects: ${subjects.length}`);
            for (const subj of subjects) {
                console.log(`    [Subject] ${subj.name} (${subj.id})`);

                // 4. Get Questions for this Subject
                const { data: questions, error: qError } = await supabase
                    .from('exam_questions')
                    .select(`
                    id, question_bank_id, is_active
                `)
                    .eq('subject_id', subj.id);

                if (qError) console.error('Question Error:', qError);

                if (questions && questions.length > 0) {
                    console.log(`      Questions: ${questions.length}`);
                    questions.forEach(q => {
                        console.log(`        - QID: ${q.id} | Active: ${q.is_active} | QB_ID: ${q.question_bank_id}`);
                    });
                } else {
                    console.log('      No questions.');
                }
            }
        } else {
            console.log('  No subjects.');
        }

        // 5. Get All Questions for this Sub-Session (ignoring subject_id filter for debug)
        const { data: directQuestions, error: dqError } = await supabase
            .from('exam_questions')
            .select(`
            id, question_bank_id, is_active, subject_id
        `)
            .eq('sub_session_id', sub.id);
        // .is('subject_id', null); // REMOVED FILTER

        if (dqError) console.error('Direct Question Error:', dqError);

        if (directQuestions && directQuestions.length > 0) {
            console.log(`  All Questions (Count: ${directQuestions.length})`);
            directQuestions.forEach(q => {
                console.log(`    - QID: ${q.id} | Active: ${q.is_active} | SubjID: ${q.subject_id} | QB_ID: ${q.question_bank_id}`);
            });
        } else {
            console.log('  No direct questions.');
        }
    }

    // 6. Check for questions in Question Bank linked via exam_session_id
    console.log('\n[Check] Looking for questions in question_bank linked directly to exam_session_id...');
    const { data: banks, error: bankError } = await supabase
        .from('question_bank')
        .select('id, question_text, exam_session_id')
        .eq('exam_session_id', EXAM_ID);

    if (bankError) {
        console.error('Question Bank Error:', bankError);
    } else {
        console.log(`Found ${banks.length} questions in question_bank with exam_session_id = ${EXAM_ID}`);
        banks.forEach(b => console.log(` - QB_ID: ${b.id} | Text: ${b.question_text ? b.question_text.substring(0, 30) : 'N/A'}...`));
    }

}

checkExam();
