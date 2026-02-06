import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import CandidateDashboardClient from './candidate-dashboard-client'

export default async function CandidateDashboard() {
    const user = await requireAuth(['candidate'])
    const supabase = await createClient()

    // 1. Get Student Details (Admission Enquiry)
    const { data: credentials } = await supabase
        .from('user_credentials')
        .select('admission_enquiry_id')
        .eq('user_id', user.id)
        .single()

    if (!credentials?.admission_enquiry_id) {
        return <div className="p-8 text-center">Student record not found.</div>
    }

    const { data: student } = await supabase
        .from('admission_enquiries')
        .select('*')
        .eq('id', credentials.admission_enquiry_id)
        .single()

    // 2. Check for Assigned Exam (Attempt)
    // We prioritize specific assignments over general active sessions
    let attempt = null
    let activeExam = null

    // First check if there is an existing attempt (assigned by controller or started previously)
    const { data: existingAttempt, error: attemptError } = await supabase
        .from('student_exam_attempts')
        .select('*, exam_session:exam_sessions(*)')
        .eq('student_id', student.id)
        // Removed status filter to strictly prevent duplicates. We must know if ANY attempt exists.
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    console.log('=== ATTEMPT FETCH DEBUG ===')
    console.log('Student ID:', student.id)
    console.log('User ID:', user.id)
    console.log('Existing Attempt:', existingAttempt)
    console.log('Attempt Error:', attemptError)
    console.log('===========================')

    if (existingAttempt) {
        attempt = existingAttempt
        // @ts-ignore
        activeExam = existingAttempt.exam_session
    }
    // No fallback - only show exams that have been explicitly assigned via student_exam_attempts

    return (
        <div className="min-h-screen bg-[#FAFAF8] p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2">
                            Candidate Dashboard
                        </h1>
                        <p className="text-[#6B6B6B] text-lg">
                            Welcome, <span className="text-[#C9A961] font-semibold">{student.first_name} {student.last_name}</span>
                        </p>
                    </div>
                </div>

                <CandidateDashboardClient
                    student={student}
                    activeExam={activeExam}
                    attempt={attempt}
                />
            </div>
        </div>
    )
}
