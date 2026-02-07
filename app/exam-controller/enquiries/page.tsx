import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { EnquiriesClient } from './enquiries-client'

async function getEnquiries() {
    const supabase = await createClient()

    const { data: enquiries, error } = await supabase
        .from('admission_enquiries')
        .select(`
            *,
            user_credentials (
                username
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching enquiries:', error)
        return { enquiries: [], examAssignments: {}, examSchedules: {} }
    }

    // Fetch exam assignments for all students
    const { data: assignmentsData } = await supabase
        .from('student_exam_attempts')
        .select('student_id, exam_session:exam_sessions(name), exam_scheduled_datetime')

    // Group by student_id
    const examAssignments: Record<string, string[]> = {}
    const examSchedules: Record<string, string | null> = {}

    if (assignmentsData) {
        assignmentsData.forEach((attempt: any) => {
            const studentId = attempt.student_id
            const examName = attempt.exam_session?.name || 'Unknown'

            // Store exam assignments
            if (!examAssignments[studentId]) {
                examAssignments[studentId] = []
            }
            if (!examAssignments[studentId].includes(examName)) {
                examAssignments[studentId].push(examName)
            }

            // Store scheduled datetime (get the latest one if multiple exams)
            if (attempt.exam_scheduled_datetime) {
                examSchedules[studentId] = attempt.exam_scheduled_datetime
            }
        })
    }

    return { enquiries: enquiries || [], examAssignments, examSchedules }
}

export default async function EnquiriesPage() {
    await requireAuth(['exam_controller', 'super_admin'])
    const { enquiries, examAssignments, examSchedules } = await getEnquiries()

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
                    Admission Enquiries
                </h1>
                <p className="text-[#6B6B6B]">
                    Manage and track all admission enquiries
                </p>
            </div>

            <EnquiriesClient
                initialEnquiries={enquiries}
                initialExamAssignments={examAssignments}
                initialExamSchedules={examSchedules}
            />
        </div>
    )
}
