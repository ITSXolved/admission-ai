import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    // Await params for Next.js 15 compatibility
    const params = await context.params

    try {
        const supabase = await createClient()

        // Get the current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if user is exam controller
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'exam_controller' && profile.role !== 'super_admin')) {
            return NextResponse.json(
                { error: 'Forbidden - Only exam controllers can delete enquiries' },
                { status: 403 }
            )
        }

        // Delete the enquiry
        const { error: deleteError } = await supabase
            .from('admission_enquiries')
            .delete()
            .eq('id', params.id)

        if (deleteError) {
            console.error('Error deleting enquiry:', deleteError)
            return NextResponse.json(
                { error: `Failed to delete enquiry: ${deleteError.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(
            { message: 'Enquiry deleted successfully' },
            { status: 200 }
        )

    } catch (error: any) {
        console.error('Error in DELETE /api/enquiries/[id]:', error)
        return NextResponse.json(
            { error: `Internal server error: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        )
    }
}
