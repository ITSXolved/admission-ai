import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'



async function getQualifiedCandidates() {
    const supabase = await createClient()

    // 1. Fetch scores with student details
    const { data: scores, error } = await supabase
        .from('student_overall_scores')
        .select(`
            id,
            student_id,
            exam_session_id,
            percentage_score,
            is_qualified,
            interview_score,
            interview_status,
            interview_date,
            fee_agreed,
            payment_mode,
            installments_count,
            installments_count,
            residence_type,
            remarks,
            admission_enquiries:student_id (
                first_name,
                last_name,
                primary_mobile,
                email,
                applying_grade
            )
        `)
        .eq('is_qualified', true)
        .order('percentage_score', { ascending: false })

    if (error) {
        console.error('Error fetching qualified candidates:', JSON.stringify(error, null, 2))
        return []
    }

    if (!scores || scores.length === 0) return []

    // 2. Fetch exam session names manually to avoid FK issues
    const examSessionIds = [...new Set(scores.map(s => s.exam_session_id))].filter(Boolean)

    let examMap: Record<string, string> = {}

    if (examSessionIds.length > 0) {
        const { data: exams, error: examError } = await supabase
            .from('exam_sessions')
            .select('id, name')
            .in('id', examSessionIds)

        if (!examError && exams) {
            exams.forEach(e => {
                examMap[e.id] = e.name
            })
        }
    }

    // 3. Attach exam names
    return scores.map(s => ({
        ...s,
        exam_session: {
            name: examMap[s.exam_session_id] || 'Unknown Exam'
        }
    }))
}

import InterviewsClient from './interviews-client'

export default async function InterviewsPage() {
    await requireAuth(['exam_controller', 'super_admin'])
    const candidates = await getQualifiedCandidates()

    return <InterviewsClient initialCandidates={candidates} />
}
