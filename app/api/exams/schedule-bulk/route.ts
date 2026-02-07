import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = createServiceClient()
        const body = await request.json()
        const { enquiryIds, examDateTime } = body

        if (!enquiryIds || !Array.isArray(enquiryIds) || enquiryIds.length === 0) {
            return NextResponse.json(
                { error: 'Missing enquiry IDs' },
                { status: 400 }
            )
        }

        if (!examDateTime) {
            return NextResponse.json(
                { error: 'Missing exam date/time' },
                { status: 400 }
            )
        }

        // Validate datetime format
        const datetime = new Date(examDateTime)
        if (isNaN(datetime.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date/time format' },
                { status: 400 }
            )
        }

        const results = []

        for (const enquiryId of enquiryIds) {
            try {
                // Update all exam attempts for this student with the scheduled datetime
                const { data, error } = await supabase
                    .from('student_exam_attempts')
                    .update({ exam_scheduled_datetime: datetime.toISOString() })
                    .eq('student_id', enquiryId)
                    .select()

                if (error) {
                    results.push({
                        enquiryId,
                        status: 'failed',
                        error: error.message
                    })
                } else if (!data || data.length === 0) {
                    results.push({
                        enquiryId,
                        status: 'skipped',
                        error: 'No exam attempts found for this student'
                    })
                } else {
                    results.push({
                        enquiryId,
                        status: 'success',
                        updatedCount: data.length
                    })
                }
            } catch (error: any) {
                console.error(`Error scheduling exam for enquiry ${enquiryId}:`, error)
                results.push({
                    enquiryId,
                    status: 'failed',
                    error: error.message
                })
            }
        }

        const successCount = results.filter(r => r.status === 'success').length
        const failedCount = results.filter(r => r.status === 'failed').length

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: enquiryIds.length,
                successful: successCount,
                failed: failedCount,
                scheduledDateTime: datetime.toISOString()
            }
        })

    } catch (error) {
        console.error('Bulk schedule error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
