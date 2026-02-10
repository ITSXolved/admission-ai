'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, X, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RemarksInput({
    scoreId,
    initialRemarks
}: {
    scoreId: string
    initialRemarks: string | null
}) {
    const [remarks, setRemarks] = useState(initialRemarks || '')
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [draftRemarks, setDraftRemarks] = useState('')

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        setRemarks(initialRemarks || '')
    }, [initialRemarks])

    const handleSave = async () => {
        if (draftRemarks === remarks) {
            setIsEditing(false)
            return
        }

        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('student_overall_scores')
                .update({ remarks: draftRemarks })
                .eq('id', scoreId)

            if (error) throw error

            setRemarks(draftRemarks)
            router.refresh()
            setIsEditing(false)
        } catch (error) {
            console.error('Error saving remarks:', error)
            alert('Failed to save remarks')
        } finally {
            setIsSaving(false)
        }
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 min-w-[200px]">
                <input
                    type="text"
                    value={draftRemarks}
                    onChange={(e) => setDraftRemarks(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#C9A961]"
                    placeholder="Add remarks..."
                    autoFocus
                    disabled={isSaving}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                        if (e.key === 'Escape') setIsEditing(false)
                    }}
                />
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-1 hover:bg-green-50 rounded text-green-600 transition-colors"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        )
    }

    return (
        <div
            onClick={() => {
                setDraftRemarks(remarks)
                setIsEditing(true)
            }}
            className="group flex items-center gap-2 cursor-pointer min-h-[32px] min-w-[150px]"
        >
            <span className={`text-sm ${remarks ? 'text-[#1A1A1A]' : 'text-gray-400 italic'}`}>
                {remarks || 'Add remarks...'}
            </span>
            <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    )
}
