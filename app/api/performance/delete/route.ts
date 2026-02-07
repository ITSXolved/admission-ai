import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createServiceClient()
        const { searchParams } = new URL(request.url)
        const scoreId = searchParams.get('scoreId')

        if (!scoreId) {
            return NextResponse.json(
                { error: 'Score ID is required' },
                { status: 400 }
            )
        }

        // Delete the performance record
        const { error } = await supabase
            .from('student_overall_scores')
            .delete()
            .eq('id', scoreId)

        if (error) {
            console.error('Error deleting performance record:', error)
            return NextResponse.json(
                { error: 'Failed to delete performance record' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Performance record deleted successfully'
        })

    } catch (error) {
        console.error('Delete performance error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
