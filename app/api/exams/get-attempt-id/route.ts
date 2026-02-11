import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase with Service Role Key to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const body = await request.json()
        console.log('[API] Get Attempt ID - Request Body:', body)
        const { student_id, exam_session_id } = body

        if (!student_id || !exam_session_id) {
            console.error('[API] Missing parameters:', { student_id, exam_session_id })
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        const { data: attempts, error } = await supabase
            .from('student_exam_attempts')
            .select('id, started_at')
            .eq('student_id', student_id)
            .eq('exam_session_id', exam_session_id)
            .order('started_at', { ascending: false })
            .limit(1)

        if (error) {
            console.error('[API] Error fetching attempt (server):', error)
            return NextResponse.json({ error: error.message, details: error }, { status: 500 })
        }

        console.log('[API] Found attempts:', attempts)

        if (!attempts || attempts.length === 0) {
            console.error('[API] No attempt found for student:', student_id, 'session:', exam_session_id)
            return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
        }

        return NextResponse.json({ attempt_id: attempts[0].id })
    } catch (error: any) {
        console.error('[API] Internal Error fetching attempt:', error)
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
