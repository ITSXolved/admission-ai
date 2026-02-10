import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import QuestionsClient from './questions-client'

export const dynamic = 'force-dynamic'

async function getQuestions(examSessionId?: string) {
  const supabase = await createClient() // Fetch Questions from Bank

  let query = supabase
    .from('question_bank')
    .select('*, exam_questions(sub_session_id)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (examSessionId) {
    query = query.eq('exam_session_id', examSessionId)
  }

  const { data: questions, error: questionsError } = await query

  if (questionsError) {
    console.error('Error fetching questions:', questionsError)
  }

  // Fetch Subjects for Dropdown
  const { data: subjects, error: subjectsError } = await supabase
    .from('exam_subjects')
    .select('*')
    .order('name')

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError)
  }

  // Fetch All Sub-Sessions (Tests)
  const { data: subSessions, error: subSessionsError } = await supabase
    .from('exam_sub_sessions')
    .select('id, name, session_type, exam_session_id')
    .order('name')

  if (subSessionsError) {
    console.error('Error fetching sub-sessions:', subSessionsError)
  }

  // Fetch Exam Sessions
  const { data: examSessions, error: examSessionsError } = await supabase
    .from('exam_sessions')
    .select('id, name')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (examSessionsError) {
    console.error('Error fetching exam sessions:', examSessionsError)
  }

  // Fetch Default Sub-Session (MCQ) for fallback
  const defaultSubSession = subSessions?.find(s => s.session_type === 'mcq')

  return {
    questions: questions || [],
    subjects: subjects || [],
    subSessions: subSessions || [],
    examSessions: examSessions || [],
    defaultSubSessionId: defaultSubSession?.id || null
  }
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requireAuth(['exam_controller', 'super_admin'])
  const resolvedParams = await searchParams
  const examSessionId = resolvedParams.exam_session_id as string

  const { questions, subjects, subSessions, examSessions, defaultSubSessionId } = await getQuestions(examSessionId)

  return (
    <QuestionsClient
      initialQuestions={questions}
      subjects={subjects}
      subSessions={subSessions}
      examSessions={examSessions}
      defaultSubSessionId={defaultSubSessionId}
    />
  )
}
