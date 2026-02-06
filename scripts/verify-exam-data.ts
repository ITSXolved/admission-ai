import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyExamData() {
    console.log('--- Verifying Exam Data ---\n')

    // 1. Check for Active Exam Sessions
    const { data: sessions, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('id, name, is_active')

    if (sessionError) {
        console.error('Error fetching sessions:', sessionError)
        return
    }

    console.log(`Found ${sessions?.length} exam sessions:`)
    sessions?.forEach(s => console.log(` - [${s.is_active ? 'ACTIVE' : 'INACTIVE'}] ${s.name} (${s.id})`))

    if (!sessions || sessions.length === 0) {
        console.log('No sessions found. This is why questions are not showing.')
        return
    }

    const activeSession = sessions.find(s => s.is_active)
    if (!activeSession) {
        console.log('No ACTIVE sessions found. RLS policies require is_active = true.')
        return
    }

    // 2. Check Sub-Sessions for the Active Session
    const { data: subSessions, error: subError } = await supabase
        .from('exam_sub_sessions')
        .select('id, name, session_type')
        .eq('exam_session_id', activeSession.id)

    if (subError) {
        console.error('Error fetching sub-sessions:', subError)
        return
    }

    console.log(`\nFound ${subSessions?.length} sub-sessions for active exam:`)
    subSessions?.forEach(s => console.log(` - ${s.name} (Type: ${s.session_type})`))

    if (!subSessions || subSessions.length === 0) {
        console.log('No sub-sessions found.')
        return
    }

    // 3. Check Questions
    const { data: questions, error: qError } = await supabase
        .from('exam_questions')
        .select('id, sub_session_id, subject_id, sequence_order, question_bank(question_text, type)')
        .in('sub_session_id', subSessions.map(s => s.id))

    // Also try fetching by subject_id to see if we missed any due to null sub_session_id
    const subjectIds = (await supabase.from('exam_subjects').select('id').in('sub_session_id', subSessions.map(s => s.id))).data?.map(s => s.id) || []
    const { data: questionsBySubject } = await supabase.from('exam_questions').select('id, sub_session_id').in('subject_id', subjectIds)

    if (qError) {
        console.error('Error fetching questions:', qError)
        return
    }

    console.log(`\nFound ${questions?.length} questions linked via sub_session_id.`)
    console.log(`Found ${questionsBySubject?.length} questions linked via subject_id.`)

    if (questions?.length !== questionsBySubject?.length) {
        console.log('WARNING: Mismatch in question counts. Some questions might have NULL sub_session_id.')
        questionsBySubject?.forEach(q => {
            if (!q.sub_session_id) console.log(` - Question ${q.id} has NULL sub_session_id`)
        })
    } else {
        questions?.forEach(q => console.log(` - Q: ${q.id} | Sub: ${q.sub_session_id}`))
    }

    console.log('\n--- Question Distribution ---')
    subSessions?.forEach(sub => {
        const subQuestions = questions?.filter(q => q.sub_session_id === sub.id) || []
        const subQuestionsBySubject = questionsBySubject?.filter(q => q.sub_session_id === sub.id) || [] // This filter checks purely by sub_session_id if populated

        // actually questionsBySubject query selected id and sub_session_id, but the *source* was filtering by subject_id.
        // We really want to know: "How many questions are in this sub-session?"

        console.log(`Sub-Session: ${sub.name} (${sub.session_type}) [ID: ${sub.id}]`)
        console.log(`  - Questions linked directly: ${subQuestions.length}`)

        subQuestions.sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0)) // formatting sort only

        subQuestions.forEach((q: any) => {
            console.log(`    - [Seq: ${q.sequence_order}] [${q.question_bank?.type}] ${q.question_bank?.question_text.substring(0, 50)}...`)
        })
    })

    if (questions && questions.length > 0) {
        console.log('Data exists properly. Issue is likely RLS policies for the Candidate role.')
    } else {
        console.log('No questions linked!')
    }
}

verifyExamData()
