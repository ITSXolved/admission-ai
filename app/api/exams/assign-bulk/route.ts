
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generatePassword, generateUsername } from '@/lib/utils'

export async function POST(request: NextRequest) {
    try {
        const supabase = createServiceClient()
        const body = await request.json()
        const { enquiryIds, examSessionId } = body

        if (!enquiryIds || !Array.isArray(enquiryIds) || enquiryIds.length === 0 || !examSessionId) {
            return NextResponse.json(
                { error: 'Missing enquiry IDs or exam session ID' },
                { status: 400 }
            )
        }

        // Get exam session details
        const { data: examSession, error: sessionError } = await supabase
            .from('exam_sessions')
            .select('*')
            .eq('id', examSessionId)
            .single()

        if (sessionError || !examSession) {
            return NextResponse.json(
                { error: 'Invalid exam session' },
                { status: 400 }
            )
        }

        const results = []

        for (const id of enquiryIds) {
            try {
                // 1. Get enquiry details
                const { data: enquiry, error: enquiryError } = await supabase
                    .from('admission_enquiries')
                    .select('id, first_name, last_name, email')
                    .eq('id', id)
                    .single()

                if (enquiryError || !enquiry) {
                    results.push({ id, status: 'failed', error: 'Enquiry not found' })
                    continue
                }

                // 2. Check/Generate Credentials
                let username
                let password
                let userId

                // Check existing
                const { data: existingCreds } = await supabase
                    .from('user_credentials')
                    .select('username, user_id')
                    .eq('admission_enquiry_id', id)
                    .single()

                if (existingCreds) {
                    username = existingCreds.username
                    userId = existingCreds.user_id
                    // We don't have the password for existing users, so we won't send it in email unless reset
                    password = null
                } else {
                    // Generate new
                    username = generateUsername(enquiry.first_name, enquiry.last_name, enquiry.id)
                    password = generatePassword(10)

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
                        results.push({ id, status: 'failed', error: 'Failed to create user account' })
                        continue
                    }

                    userId = authData.user.id

                    // Create profile
                    await supabase.from('profiles').insert({
                        id: userId,
                        full_name: `${enquiry.first_name} ${enquiry.last_name}`,
                        email: enquiry.email,
                        role: 'candidate',
                    })

                    // Create credentials
                    await supabase.from('user_credentials').insert({
                        user_id: userId,
                        admission_enquiry_id: id,
                        username: username,
                        is_active: true,
                    })
                }

                // 3. Create Exam Attempt (if not exists)
                const { data: existingAttempt } = await supabase
                    .from('student_exam_attempts')
                    .select('id')
                    .eq('student_id', id)
                    .eq('exam_session_id', examSessionId)
                    .single()

                if (!existingAttempt) {
                    await supabase.from('student_exam_attempts').insert({
                        student_id: id,
                        exam_session_id: examSessionId,
                        status: 'not_started' // Explicitly set status
                    })
                }

                // 4. Update Enquiry Status
                await supabase
                    .from('admission_enquiries')
                    .update({
                        exam_status: 'not_started',
                        overall_status: 'applied' // Or ensure it's in a state where they can take test
                    })
                    .eq('id', id)


                // 5. Send Notification Email
                // Only send if we generated a password OR if we want to notify about the exam regardless
                // For now, let's assume we send an email with login details if new, or just exam details if existing

                // Fetch the template we want to use (optional, or hardcode for now)

                // TODO: Call the email sending API or insert into email_logs
                // For simplicity in this step, we will call the send-email logic directly or via fetch if possible
                // Since we are server-side, we can just invoke the logic or skip it for this MVP iteration
                // Let's assume the frontend will handle "Share Credentials" separately if needed, 
                // OR we can integrate it here. 
                // The user request "assign them a test" implies enabling access. 
                // Sending credentials is a 'good to have'. Let's stick to enabling access first.

                results.push({ id, status: 'success', username })

            } catch (error: any) {
                console.error(`Error processing student ${id}:`, error)
                results.push({ id, status: 'failed', error: error.message })
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `Processed ${results.length} students`
        })

    } catch (error) {
        console.error('Bulk assign error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
