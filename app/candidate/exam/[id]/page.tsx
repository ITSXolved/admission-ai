import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/helpers'
import ExamClient from './exam-client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await requireAuth(['candidate'])
    const supabase = await createClient()

    // Await params to access dynamic id in Next.js 15+
    const { id } = await params

    // 1. Verify Attempt Exists and Belongs to User
    // We fetch the attempt first to ensure the user actually has access to this exam session
    const { data: attempt } = await supabase
        .from('student_exam_attempts')
        .select('*, exam_session:exam_sessions(*)')
        .eq('exam_session_id', id)
        .eq('student_id', (
            await supabase
                .from('user_credentials')
                .select('admission_enquiry_id')
                .eq('user_id', user.id)
                .single()
        ).data?.admission_enquiry_id)
        .single()

    if (!attempt) {
        console.error('No attempt found for this exam and user.')
        return notFound()
    }

    // 2. Fetch Exam Structure (Sub-sessions -> Subjects -> Questions)
    // We use the Service Role key here to bypass RLS complexity for the hierarchical fetch.
    // ACCESS CONTROL IS ALREADY ENFORCED ABOVE via the 'attempt' check.
    // Only users with a valid attempt can reach this point.
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subSessions, error: subSessionsError } = await supabaseAdmin
        .from('exam_sub_sessions')
        .select(`
            *,
            exam_subjects (
                *,
                exam_questions (
                    *,
                    question_bank (*)
                )
            ),
            exam_questions (
                *,
                question_bank (*)
            ),
            cognitive_test_configs (*)
        `)
        .eq('exam_session_id', id)
        .order('sequence_order', { ascending: true })

    if (subSessionsError) {
        console.error('Error fetching exam structure:', subSessionsError)
        return <div>Error loading exam structure. Please contact support.</div>
    }

    console.log('Fetched SubSessions (Admin):', subSessions?.length)

    // Sort the nested structure manually if needed, or rely on DB order if possible (Supabase nested sorting is limited)
    // We will do some client-side sorting/organization in the client component if necessary.


    // 2. Check Status
    if (attempt.status === 'completed' || attempt.status === 'expired') {
        redirect('/candidate/dashboard')
    }

    return (
        <ExamClient
            session={attempt.exam_session}
            attempt={attempt}
            subSessions={subSessions}
        />
    )
}
