import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { replaceTemplateVariables } from '@/lib/utils/whatsapp'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify user is authenticated and has exam_controller role
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, school_id')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'exam_controller') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const bodyParts = await request.json()
        const {
            enquiryIds, // New: Array of IDs to fetch emails for
            recipientIds, // Legacy/Direct: Array of IDs if emails provided
            recipientEmails, // Legacy/Direct: Array of emails
            subject,
            message, // Client sends 'message'
            body: emailBody, // Legacy uses 'body'
            templateVariables
        } = bodyParts

        // Resolve emails:
        // 1. If enquiryIds provided, fetch from DB
        // 2. Else use provided recipientEmails

        let targetEmails: string[] = []
        let targetIds: string[] = []

        if (enquiryIds && enquiryIds.length > 0) {
            const { data: enquiries, error: fetchError } = await supabase
                .from('admission_enquiries')
                .select('id, email')
                .in('id', enquiryIds)

            if (fetchError || !enquiries) {
                console.error('Error fetching enquiries for email:', fetchError)
                return NextResponse.json({ error: 'Failed to fetch recipient emails' }, { status: 500 })
            }

            targetEmails = enquiries.map(e => e.email).filter(Boolean)
            targetIds = enquiries.map(e => e.id)
        } else {
            targetEmails = recipientEmails || []
            targetIds = recipientIds || []
        }

        if (targetEmails.length === 0) {
            return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
        }

        // Get SMTP configuration from school
        const { data: school } = await supabase
            .from('schools')
            .select('smtp_email, smtp_password')
            .eq('id', profile.school_id)
            .single()

        const smtpEmail = school?.smtp_email || process.env.SMTP_USER
        const smtpPassword = school?.smtp_password || process.env.SMTP_PASSWORD

        if (!smtpEmail || !smtpPassword) {
            return NextResponse.json(
                { error: 'SMTP configuration not found' },
                { status: 400 }
            )
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: smtpEmail,
                pass: smtpPassword,
            },
        })

        const results = []
        const finalBodyContent = message || emailBody

        // Send emails
        for (let i = 0; i < targetEmails.length; i++) {
            const email = targetEmails[i]
            const recipientId = targetIds[i] // Match by index if fetched from DB

            // Replace template variables if provided
            let finalSubject = subject
            let finalBody = finalBodyContent

            // Simple replacement for now if template vars exist
            // (Note: For bulk fetched emails, we might not have custom vars per user yet without fetching more data)

            try {
                await transporter.sendMail({
                    from: `"AILT Global Academy" <${smtpEmail}>`,
                    to: email,
                    subject: finalSubject,
                    html: finalBody,
                })

                // Log email
                await supabase.from('email_logs').insert({
                    recipient_id: recipientId,
                    recipient_email: email,
                    subject: finalSubject,
                    body: finalBody,
                    sent_by: user.id,
                    status: 'sent',
                })

                results.push({ email, status: 'sent' })
            } catch (error) {
                console.error(`Failed to send email to ${email}:`, error)

                // Log failed email
                await supabase.from('email_logs').insert({
                    recipient_id: recipientId,
                    recipient_email: email,
                    subject: finalSubject,
                    body: finalBody,
                    sent_by: user.id,
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                })

                results.push({
                    email,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        }

        return NextResponse.json({
            success: true,
            results,
            totalSent: results.filter(r => r.status === 'sent').length,
            totalFailed: results.filter(r => r.status === 'failed').length,
        })

    } catch (error) {
        console.error('Email API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
