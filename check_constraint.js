
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opyuiplvavwsjbyofbbk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weXVpcGx2YXZ3c2pieW9mYmJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2Mjk3MiwiZXhwIjoyMDgzOTM4OTcyfQ.5c1k-gf4f1nxB1IsX5Ci9mw2YcWVkGwnmKGRYBsjN_A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
    console.log('Checking constraints on student_overall_scores...');

    const { data, error } = await supabase
        .rpc('get_table_constraints', { table_name: 'student_overall_scores' });

    if (error) {
        // Fallback to direct query if RPC doesn't exist (which it likely doesn't)
        // We can't query information_schema directly via JS client usually unless exposed...
        // But we can try to update a row with an invalid value and see the error message.
        console.log('RPC failed, trying update test...');

        // Find a valid ID first
        const { data: rows } = await supabase.from('student_overall_scores').select('id').limit(1);
        if (rows && rows.length > 0) {
            const id = rows[0].id;
            const { error: updateError } = await supabase
                .from('student_overall_scores')
                .update({ interview_status: 'INVALID_TEST_VALUE' })
                .eq('id', id);

            if (updateError) {
                console.log('Update Error:', updateError);
                if (updateError.message.includes('check_interview_status')) {
                    console.log('CONSTRAINT EXISTS: check_interview_status');
                } else {
                    console.log('Constraint might not exist or other error.');
                }
            } else {
                console.log('Update SUCCESS: No constraint exists on interview_status.');
                // Revert
                await supabase.from('student_overall_scores').update({ interview_status: 'pending' }).eq('id', id);
            }
        } else {
            console.log('No rows to test.');
        }
    } else {
        console.log('Constraints:', data);
    }
}

checkConstraints();
