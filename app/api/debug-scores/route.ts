import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use SERVICE ROLE key to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')

    if (!student_id) {
        return NextResponse.json({ error: 'Missing student_id' })
    }

    // 1. Check Score
    const { data: scores, error: scoreError } = await supabase
        .from('student_overall_scores')
        .select('*')
        .eq('student_id', student_id)

    // 2. Check Responses
    const { data: mcq, error: mcqError } = await supabase
        .from('student_mcq_responses')
        .select('count')
        .eq('attempt_id', '4e16f7f1-819f-4c51-8e01-fe98008ea807')

    // 3. Check Credentials Mapping
    const { data: creds } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('admission_enquiry_id', student_id)

    // 4. Check Written Evaluations via Response
    const { data: writtenResponses } = await supabase
        .from('student_written_responses')
        .select('*, written_evaluations(*)')
        .eq('attempt_id', '4e16f7f1-819f-4c51-8e01-fe98008ea807')


    // 5. DEBUG: Calculate Total Possible Marks
    // Fetch attempt to get session ID
    const { data: attempt } = await supabase
        .from('student_exam_attempts')
        .select('exam_session_id')
        .eq('student_id', student_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    let debugCalc = null
    if (attempt) {
        const { data: subSessions } = await supabase
            .from('exam_sub_sessions')
            .select('id, session_type, title, weightage')
            .eq('exam_session_id', attempt.exam_session_id)

        const { data: allQuestions } = await supabase
            .from('exam_questions')
            .select('id, marks, sub_session_id')
            .in('sub_session_id', subSessions?.map(s => s.id) || [])

        const breakdown = subSessions?.map(s => ({
            ...s,
            question_count: allQuestions?.filter(q => q.sub_session_id === s.id).length,
            total_marks: allQuestions?.filter(q => q.sub_session_id === s.id).reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
        }))

        const calculatedTotal = breakdown?.filter(s => s.session_type !== 'cognitive').reduce((sum, s) => sum + (s.total_marks || 0), 0)

        debugCalc = {
            calculatedTotal,
            subSessions: breakdown
        }
    }

    return NextResponse.json({
        student_id,
        scores,
        scoreError,
        creds,
        check_mcq_count: mcq,
        written_responses: writtenResponses,
        debug_calculation: debugCalc
    })
}

export async function POST(request: Request) {
    const { attempt_id } = await request.json()

    if (!attempt_id) {
        return NextResponse.json({ error: 'Missing attempt_id' })
    }

    // Reset attempt to 'started' so it can be re-submitted
    const { data, error } = await supabase
        .from('student_exam_attempts')
        .update({
            status: 'in_progress',
            submitted_at: null
        })
        .eq('id', attempt_id)
        .select()

    return NextResponse.json({ success: true, data, error })
}
