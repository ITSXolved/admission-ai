import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRole } from '@/lib/types/database'

export async function getCurrentUser() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    // Get user profile with role
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return {
        ...user,
        profile
    }
}

export async function requireAuth(allowedRoles?: UserRole[]) {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    if (allowedRoles && user.profile && !allowedRoles.includes(user.profile.role as UserRole)) {
        redirect('/unauthorized')
    }

    return user
}

export async function checkRole(role: UserRole): Promise<boolean> {
    const user = await getCurrentUser()
    return user?.profile?.role === role
}

export async function getAdmissionEnquiryForUser(userId: string) {
    const supabase = await createClient()

    const { data } = await supabase
        .from('user_credentials')
        .select('admission_enquiry_id')
        .eq('user_id', userId)
        .single()

    return data?.admission_enquiry_id || null
}
