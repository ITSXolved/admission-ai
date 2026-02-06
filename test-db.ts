import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8')
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=')
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
        }
    })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
    console.log('Testing query on exam_sessions...')
    const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
      *,
      exam_sub_sessions (
        id,
        session_type,
        weightage,
        is_active
      )
    `)
        .limit(1)

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Success:', data)
    }
}

testQuery()
