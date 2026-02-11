
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opyuiplvavwsjbyofbbk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weXVpcGx2YXZ3c2pieW9mYmJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2Mjk3MiwiZXhwIjoyMDgzOTM4OTcyfQ.5c1k-gf4f1nxB1IsX5Ci9mw2YcWVkGwnmKGRYBsjN_A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findExam() {
    const { data, error } = await supabase
        .from('exam_sessions')
        .select('id, name, is_active, created_at')
        .ilike('name', '%test%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found Exams:', data);
    }
}

findExam();
