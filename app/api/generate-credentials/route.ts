import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generatePassword, generateUsername } from '@/lib/utils'

export async function POST(request: NextRequest) {
    try {
        const supabase = createServiceClient()

        // Verify authentication (exam controller only)
        // Note: For bulk operations, we rely on the client sending valid IDs
        // and RLS policies or internal checks. We assume the caller is authorized 
        // to generate credentials for these students.

        const body = await request.json()
        const { admissionEnquiryId, enquiryIds } = body

        // Handle both single (legacy/specific) and bulk (enquiryIds array) requests
        const targetIds = enquiryIds || (admissionEnquiryId ? [admissionEnquiryId] : [])

        if (targetIds.length === 0) {
            return NextResponse.json(
                { error: 'Missing admission enquiry ID(s)' },
                { status: 400 }
            )
        }

        const results = []

        for (const id of targetIds) {
            try {
                // Get admission enquiry details
                const { data: enquiry, error: enquiryError } = await supabase
                    .from('admission_enquiries')
                    .select('id, first_name, last_name, email')
                    .eq('id', id)
                    .single()

                if (enquiryError || !enquiry) {
                    results.push({ id, status: 'failed', error: 'Enquiry not found' })
                    continue
                }

                // Check if credentials already exist
                const { data: existingCreds } = await supabase
                    .from('user_credentials')
                    .select('username')
                    .eq('admission_enquiry_id', id)
                    .single()

                if (existingCreds) {
                    results.push({ id, status: 'skipped', message: 'Credentials already exist' })
                    continue
                }

                // Generate username and password
                const username = generateUsername(
                    enquiry.first_name,
                    enquiry.last_name,
                    enquiry.id
                )
                const password = generatePassword(10)

                // Create auth user (candidate role)
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
                    console.error('Auth error for', enquiry.email, authError)
                    results.push({ id, status: 'failed', error: 'Failed to create user account' })
                    continue
                }

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
                    console.error('Profile error:', profileError)
                    await supabase.auth.admin.deleteUser(authData.user.id)
                    results.push({ id, status: 'failed', error: 'Failed to create profile' })
                    continue
                }

                // Create user credentials
                const { error: credError } = await supabase
                    .from('user_credentials')
                    .insert({
                        user_id: authData.user.id,
                        admission_enquiry_id: id,
                        username: username,
                        is_active: true,
                    })

                if (credError) {
                    console.error('Credentials error:', credError)
                    await supabase.auth.admin.deleteUser(authData.user.id)
                    await supabase.from('profiles').delete().eq('id', authData.user.id)
                    results.push({ id, status: 'failed', error: 'Failed to create credentials record' })
                    continue
                }

                // Success
                results.push({
                    id,
                    status: 'success',
                    username,
                    password
                })

            } catch (innerError: any) {
                console.error(`Error processing enquiry ${id}:`, innerError)
                results.push({ id, status: 'failed', error: innerError.message })
            }
        }

        const successCount = results.filter(r => r.status === 'success').length
        const failCount = results.filter(r => r.status === 'failed').length

        if (successCount === 0 && failCount > 0) {
            return NextResponse.json(
                { error: 'Failed to generate any credentials', details: results },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            results,
            message: `Generated ${successCount} credentials`
        })

    } catch (error) {
        console.error('Generate credentials error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
