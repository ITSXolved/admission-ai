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

const EXAM_SESSION_ID = '21ea9574-6734-46e6-adbf-fc7cc4af5ce0' // test2
// From previous verification output:
// Sub-Session: MCQ Assessment (mcq) [ID: d24a5d79-69f1-455f-b6db-73942ea90a67]

const SUB_SESSION_ID = 'd24a5d79-69f1-455f-b6db-73942ea90a67'

async function seedMCQs() {
    console.log('--- Seeding Sample MCQ Questions ---\n')

    // 1. Create Questions in Question Bank
    const questions = [
        {
            question_text: "What is the capital of France?",
            type: "mcq",
            options: ["London", "Berlin", "Paris", "Madrid"],
            correct_answer: "Paris",
            marks: 1
        },
        {
            question_text: "Which planet is known as the Red Planet?",
            type: "mcq",
            options: ["Earth", "Mars", "Jupiter", "Venus"],
            correct_answer: "Mars",
            marks: 1
        },
        {
            question_text: "What is 2 + 2?",
            type: "mcq",
            options: ["3", "4", "5", "22"],
            correct_answer: "4",
            marks: 1
        }
    ]

    const { data: insertedQuestions, error: insertError } = await supabase
        .from('question_bank')
        .insert(questions)
        .select()

    if (insertError) {
        console.error('Error inserting questions:', insertError)
        return
    }

    console.log(`Inserted ${insertedQuestions.length} questions into Question Bank.`)

    // 2. Link to Exam Sub-Session
    const examQuestions = insertedQuestions.map((q, index) => ({
        sub_session_id: SUB_SESSION_ID,
        question_bank_id: q.id,
        marks: q.marks,
        sequence_order: index + 1,
        is_active: true
    }))

    const { error: linkError } = await supabase
        .from('exam_questions')
        .insert(examQuestions)

    if (linkError) {
        console.error('Error linking questions to exam:', linkError)
        return
    }

    console.log('Successfully linked questions to MCQ Assessment sub-session!')
}

seedMCQs()
