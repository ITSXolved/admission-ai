import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const { response_id, new_score, attempt_id } = await request.json()

        if (!response_id || new_score === undefined || !attempt_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        console.log(`Updating score for response ${response_id} to ${new_score}`)

        // 1. Update the specific evaluation
        // We assume an evaluation record exists. If not, we might need to create one, 
        // but for now we assume it exists if we are reviewing it.
        const { error: updateError } = await supabase
            .from('written_evaluations')
            .update({
                total_score: new_score,
                evaluator_type: 'human', // Mark as human edited
                evaluated_at: new Date().toISOString()
            })
            .eq('written_response_id', response_id) // Use correct column name used in submit-exam 'written_response_id'?
        // checking submit-exam: .upsert(dbData, { onConflict: 'written_response_id' })
        // yes, written_response_id is the key. 
        // BUT wait, in submit-exam line 167 upsert onConflict is 'written_response_id'.
        // So column name is likely 'written_response_id'. 
        // Let's verify schema if possible, but submit-exam usage strongly suggests it.

        if (updateError) throw updateError

        // 2. Recalculate Totals
        // 2a. Fetch all evaluations for this attempt
        const { data: evaluations, error: evalError } = await supabase
            .from('written_evaluations')
            .select('total_score, student_written_responses!inner(attempt_id)')
            .eq('student_written_responses.attempt_id', attempt_id)

        if (evalError) throw evalError

        const newWrittenScore = evaluations?.reduce((sum, ev) => sum + (Number(ev.total_score) || 0), 0) || 0

        // 2b. Fetch MCQ Score and Total Possible Marks to update overall
        // We need existing overall score record to get mcq_score and total_possible
        // We can fetch via student_exam_attempts -> student_overall_scores?
        // Or just fetch student_overall_scores using student_id and exam_session_id from attempt.

        const { data: attempt } = await supabase
            .from('student_exam_attempts')
            .select('student_id, exam_session_id')
            .eq('id', attempt_id)
            .single()

        if (!attempt) throw new Error('Attempt not found')

        const { data: currentOverall } = await supabase
            .from('student_overall_scores')
            .select('*')
            .eq('student_id', attempt.student_id)
            .eq('exam_session_id', attempt.exam_session_id)
            .single()

        if (!currentOverall) throw new Error('Overall score record not found')

        const mcqScore = Number(currentOverall.mcq_score) || 0
        const totalWeightedScore = mcqScore + newWrittenScore
        const totalPossible = Number(currentOverall.total_possible_marks) || 100 // Fallback
        const percentage = totalPossible > 0 ? (totalWeightedScore / totalPossible) * 100 : 0

        // 3. Update Overall Score
        const { error: overallError } = await supabase
            .from('student_overall_scores')
            .update({
                written_score: newWrittenScore,
                total_weighted_score: totalWeightedScore,
                percentage_score: percentage,
                is_qualified: percentage >= 40, // Re-evaluate qualification
                // calculated_at: new Date().toISOString() // Optional
            })
            .eq('id', currentOverall.id)

        if (overallError) throw overallError

        return NextResponse.json({
            success: true,
            new_written_score: newWrittenScore,
            new_percentage: percentage
        })

    } catch (error: any) {
        console.error('Error updating score:', error)
        return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 })
    }
}
