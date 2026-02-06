import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listSubjects() {
    console.log('--- Listing Exam Subjects ---')
    const { data: subjects, error } = await supabase
        .from('exam_subjects')
        .select('*')

    if (error) {
        console.error('Error:', error)
        return
    }

    if (!subjects || subjects.length === 0) {
        console.log('No subjects found.')
        return
    }

    console.table(subjects.map(s => ({
        id: s.id,
        name: s.name,
        weightage: s.weightage
    })))
}

listSubjects()
