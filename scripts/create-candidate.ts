/**
 * Helper script to create candidate credentials
 * 
 * Usage:
 * 1. First, create an admission enquiry in the database
 * 2. Then run this script with the enquiry ID
 * 
 * Example:
 * npx tsx scripts/create-candidate.ts <admission-enquiry-id>
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createCandidate(admissionEnquiryId: string) {
    try {
        console.log('Creating candidate credentials...')

        // Get admission enquiry details
        const { data: enquiry, error: enquiryError } = await supabase
            .from('admission_enquiries')
            .select('id, first_name, last_name, email')
            .eq('id', admissionEnquiryId)
            .single()

        if (enquiryError || !enquiry) {
            console.error('❌ Admission enquiry not found')
            return
        }

        console.log(`Found enquiry for: ${enquiry.first_name} ${enquiry.last_name}`)

        // Generate username and password
        const username = `${enquiry.first_name.toLowerCase()}${enquiry.last_name.toLowerCase()}${enquiry.id.substring(0, 6)}`
        const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase()

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: enquiry.email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: `${enquiry.first_name} ${enquiry.last_name}`,
                role: 'candidate',
            },
        })

        if (authError || !authData.user) {
            console.error('❌ Failed to create auth user:', authError)
            return
        }

        console.log('✅ Auth user created')

        // Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                full_name: `${enquiry.first_name} ${enquiry.last_name}`,
                email: enquiry.email,
                role: 'candidate',
            })

        if (profileError) {
            console.error('❌ Failed to create profile:', profileError)
            return
        }

        console.log('✅ Profile created')

        // Create user credentials
        const { error: credError } = await supabase
            .from('user_credentials')
            .insert({
                user_id: authData.user.id,
                admission_enquiry_id: admissionEnquiryId,
                username: username,
                is_active: true,
            })

        if (credError) {
            console.error('❌ Failed to create credentials:', credError)
            return
        }

        console.log('\n🎉 Candidate created successfully!\n')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📧 Email:', enquiry.email)
        console.log('👤 Username:', username)
        console.log('🔑 Password:', password)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('\n⚠️  Save these credentials! The password cannot be retrieved later.')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

// Get admission enquiry ID from command line
const admissionEnquiryId = process.argv[2]

if (!admissionEnquiryId) {
    console.error('❌ Please provide an admission enquiry ID')
    console.log('Usage: npx tsx scripts/create-candidate.ts <admission-enquiry-id>')
    process.exit(1)
}

createCandidate(admissionEnquiryId)
