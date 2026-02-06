/**
 * Helper script to create exam controller account
 * 
 * Usage:
 * npx tsx scripts/create-exam-controller.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve)
    })
}

async function createExamController() {
    try {
        console.log('\n🎓 Create Exam Controller Account\n')

        const fullName = await question('Full Name: ')
        const email = await question('Email: ')
        const password = await question('Password: ')
        const schoolId = await question('School ID (optional, press Enter to skip): ')

        console.log('\nCreating exam controller account...')

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: 'exam_controller',
            },
        })

        if (authError || !authData.user) {
            console.error('❌ Failed to create auth user:', authError)
            rl.close()
            return
        }

        console.log('✅ Auth user created')

        // Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                full_name: fullName,
                email: email,
                role: 'exam_controller',
                school_id: schoolId || null,
            })

        if (profileError) {
            console.error('❌ Failed to create profile:', profileError)
            rl.close()
            return
        }

        console.log('✅ Profile created')
        console.log('\n🎉 Exam Controller account created successfully!\n')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('👤 Name:', fullName)
        console.log('📧 Email:', email)
        console.log('🔑 Password:', password)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('\nYou can now login at: http://localhost:3000/login')

        rl.close()

    } catch (error) {
        console.error('❌ Error:', error)
        rl.close()
    }
}

createExamController()
