import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import QuestionsClient from './questions-client'

async function getQuestions() {
  const supabase = await createClient() // Fetch Questions from Bank
  const { data: questions, error: questionsError } = await supabase
    .from('question_bank')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

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

export default async function QuestionsPage() {
  await requireAuth(['exam_controller', 'super_admin'])
  const { questions, subjects, subSessions, examSessions, defaultSubSessionId } = await getQuestions()

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
