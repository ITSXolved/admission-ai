'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function StatusCell({
    scoreId,
    initialStatus
}: {
    scoreId: string
    initialStatus: boolean
}) {
    const [isQualified, setIsQualified] = useState(initialStatus)
    const [isUpdating, setIsUpdating] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const toggleStatus = async () => {
        setIsUpdating(true)
        const newStatus = !isQualified

        try {
            const { error } = await supabase
                .from('student_overall_scores')
                .update({ is_qualified: newStatus })
                .eq('id', scoreId)

            if (error) throw error

            setIsQualified(newStatus)
            router.refresh()
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update status')
            setIsQualified(!newStatus) // Revert on error
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <button
            onClick={toggleStatus}
            disabled={isUpdating}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${isQualified
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : isQualified ? (
                <Check className="h-3 w-3" />
            ) : (
                <X className="h-3 w-3" />
            )}
            {isQualified ? 'Qualified' : 'Not Qualified'}
        </button>
    )
}
