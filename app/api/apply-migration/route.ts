import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = await createClient()

    try {
        // 0. Ensure column exists (DDL)
        const { error: ddlError } = await supabase.rpc('execute_sql', {
            sql_query: `
        ALTER TABLE public.question_bank 
        ADD COLUMN IF NOT EXISTS exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_question_bank_exam_session ON public.question_bank(exam_session_id);
      `
        })

        if (ddlError) {
            console.warn('DDL Execution failed (might be lack of permissions or RPC missing):', ddlError)
            // Continue anyway, maybe it exists? If not, the update will fail and we catch it below.
        }

        // 1. Find the Exam Session ID for "Admission Test 1"
        const { data: sessions, error: sessionError } = await supabase
            .from('exam_sessions')
            .select('id, name')
            .ilike('name', '%Admission Test 1%')
            .limit(1)

        if (sessionError || !sessions || sessions.length === 0) {
            return NextResponse.json({
                error: 'Could not find "Admission Test 1" session.',
                details: sessionError
            }, { status: 404 })
        }

        const targetSessionId = sessions[0].id
        const targetSessionName = sessions[0].name

        // 2. Update all questions that don't have an exam_session_id
        const { data, error: updateError, count } = await supabase
            .from('question_bank')
            .update({ exam_session_id: targetSessionId })
            .or('exam_session_id.is.null,exam_session_id.eq.null') // Check for null explicitly
            .select('id', { count: 'exact' })

        if (updateError) {
            return NextResponse.json({
                error: 'Failed to update questions. Column might be missing if DDL failed.',
                details: updateError
            }, { status: 500 })
        }

        return NextResponse.json({
            message: 'Successfully assigned questions to exam session.',
            session: targetSessionName,
            sessionId: targetSessionId,
            updatedCount: count || (data && data.length) || 0
        })

    } catch (err: any) {
        return NextResponse.json({
            error: 'Migration failed',
            details: err.message
        }, { status: 500 })
    }
}
```
