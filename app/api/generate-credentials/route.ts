import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generatePassword, generateUsername } from '@/lib/utils'

export async function POST(request: NextRequest) {
    try {
        console.log('=== Generate Credentials API Called ===')
        const supabase = createServiceClient()

        const body = await request.json()
        console.log('Request body:', body)
        const { admissionEnquiryId, enquiryIds, regenerate } = body

        const targetIds = enquiryIds || (admissionEnquiryId ? [admissionEnquiryId] : [])
        console.log('Target IDs:', targetIds)
        console.log('Regenerate flag:', regenerate)

        if (targetIds.length === 0) {
            console.error('No enquiry IDs provided')
            return NextResponse.json(
                { error: 'Missing admission enquiry ID(s)' },
                { status: 400 }
            )
        }

        const results = []

        for (const id of targetIds) {
            console.log(`\n--- Processing enquiry: ${id} ---`)
            try {
                // Get admission enquiry details
                console.log('Fetching enquiry from database...')
                const { data: enquiry, error: enquiryError } = await supabase
                    .from('admission_enquiries')
                    .select('id, first_name, last_name, email')
                    .eq('id', id)
                    .single()

                if (enquiryError || !enquiry) {
                    console.error('Enquiry fetch error:', enquiryError)
                    results.push({ id, status: 'failed', error: 'Enquiry not found' })
                    continue
                }
                console.log('Enquiry found:', enquiry)


                // Check if credentials already exist
                console.log('Checking for existing credentials...')
                const { data: existingCreds } = await supabase
                    .from('user_credentials')
                    .select('username, user_id')
                    .eq('admission_enquiry_id', id)
                    .single()

                console.log('existingCreds:', existingCreds)
                console.log('regenerate flag:', regenerate, 'type:', typeof regenerate)
                console.log('Condition check: existingCreds &&!regenerate =', !!(existingCreds && !regenerate))
                console.log('Condition check: existingCreds && regenerate =', !!(existingCreds && regenerate))

                if (existingCreds && !regenerate) {
                    console.log('Credentials already exist:', existingCreds)
                    results.push({ id, status: 'skipped', message: 'Credentials already exist', username: existingCreds.username })
                    continue
                }


                // If regenerating, generate new password and update
                if (existingCreds && regenerate) {
                    console.log('Regenerating password for existing user...')
                    const newPassword = generatePassword(10)

                    // Update password in auth
                    const { error: updateError } = await supabase.auth.admin.updateUserById(
                        existingCreds.user_id,
                        { password: newPassword }
                    )

                    if (updateError) {
                        console.error('Failed to update password:', updateError)
                        results.push({ id, status: 'failed', error: `Failed to update password: ${updateError.message}` })
                        continue
                    }

                    console.log('✓ Password regenerated successfully')
                    results.push({
                        id,
                        status: 'success',
                        username: existingCreds.username,
                        password: newPassword,
                        regenerated: true
                    })
                    continue
                }

                // Generate username and password
                const username = generateUsername(
                    enquiry.first_name,
                    enquiry.last_name,
                    enquiry.id
                )
                const password = generatePassword(10)
                console.log('Generated username:', username)

                // Create auth user (candidate role)
                console.log('Creating auth user...')
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
                    console.error('Auth error for', enquiry.email, ':', authError)
                    results.push({ id, status: 'failed', error: `Failed to create user account: ${authError?.message}` })
                    continue
                }
                console.log('Auth user created:', authData.user.id)

                // Create profile
                console.log('Creating profile...')
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
                    results.push({ id, status: 'failed', error: `Failed to create profile: ${profileError.message}` })
                    continue
                }
                console.log('Profile created successfully')

                // Create user credentials
                console.log('Creating user credentials record...')
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
                    results.push({ id, status: 'failed', error: `Failed to create credentials record: ${credError.message}` })
                    continue
                }
                console.log('User credentials created successfully')

                // Success
                results.push({
                    id,
                    status: 'success',
                    username,
                    password
                })
                console.log('✓ Credential generation successful for', id)

            } catch (innerError: any) {
                console.error(`Error processing enquiry ${id}:`, innerError)
                results.push({ id, status: 'failed', error: innerError.message })
            }
        }

        const successCount = results.filter(r => r.status === 'success').length
        const failCount = results.filter(r => r.status === 'failed').length
        console.log(`\n=== Summary: ${successCount} success, ${failCount} failed ===`)

        if (successCount === 0 && failCount > 0) {
            console.error('All credential generations failed')
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
        console.error('Generate credentials API error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
