
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opyuiplvavwsjbyofbbk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weXVpcGx2YXZ3c2pieW9mYmJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2Mjk3MiwiZXhwIjoyMDgzOTM4OTcyfQ.5c1k-gf4f1nxB1IsX5Ci9mw2YcWVkGwnmKGRYBsjN_A';

const supabase = createClient(supabaseUrl, supabaseKey);

const QID = 'f2724989-fc4e-4dbf-b96c-3c7c2dee7297';

async function debugQuestion() {
    console.log(`Debugging Question ID: ${QID}`);

    // 1. Get Question Details
    const { data: q, error: qError } = await supabase
        .from('question_bank')
        .select('*')
        .eq('id', QID)
        .single();

    if (qError) { console.error('Question Error:', qError); return; }
    console.log('Question:', q);

    // 2. Get Exam Questions Links
    const { data: links, error: lError } = await supabase
        .from('exam_questions')
        .select('*, sub_session:sub_session_id(id, name, exam_session_id)')
        .eq('question_bank_id', QID);

    if (lError) { console.error('Link Error:', lError); return; }
    console.log(`Found ${links.length} links in exam_questions:`);
    links.forEach(l => {
        console.log(JSON.stringify(l, null, 2));
    });
}

debugQuestion();
