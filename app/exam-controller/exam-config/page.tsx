import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import ExamConfigClient from './exam-config-client'

async function getExamSessions() {
    const supabase = await createClient()

    const { data: sessions, error } = await supabase
        .from('exam_sessions')
        .select(`
      *,
      exam_sub_sessions (
        id,
        session_type,
        weightage,
        cognitive_test_configs (*)
      )
    `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching exam sessions:', error)
        return []
    }

    return sessions || []
}

export default async function ExamConfigPage() {
    await requireAuth(['exam_controller', 'super_admin'])
    const sessions = await getExamSessions()

    return <ExamConfigClient initialSessions={sessions} />
}
