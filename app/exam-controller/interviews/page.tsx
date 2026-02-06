import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import CandidateRow from './components/CandidateRow'

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
            residence_type,
            admission_enquiries:student_id (
                first_name,
                last_name,
                primary_mobile,
                email
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

export default async function InterviewsPage() {
    await requireAuth(['exam_controller', 'super_admin'])
    const candidates = await getQualifiedCandidates()

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
                    Interview Management
                </h1>
                <p className="text-[#6B6B6B]">
                    Manage interviews for qualified candidates ({candidates.length})
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#FAFAF8] border-b border-[#E5E7EB]">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Candidate</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Exam</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Written %</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Interview Score</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Schedule</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Admission</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-gray-500">
                                        No qualified candidates found yet.
                                    </td>
                                </tr>
                            ) : (
                                candidates.map((candidate: any) => (
                                    <CandidateRow key={candidate.id} candidate={candidate} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
