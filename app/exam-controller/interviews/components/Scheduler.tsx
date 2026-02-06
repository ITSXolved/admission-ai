'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Scheduler({
    scoreId,
    initialDate
}: {
    scoreId: string
    initialDate: string | null
}) {
    // initialize state
    const [date, setDate] = useState<string>(initialDate ? new Date(initialDate).toISOString().slice(0, 16) : '')
    const [isOpen, setIsOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const router = useRouter()
    const supabase = createClient()
    const buttonRef = useRef<HTMLButtonElement>(null)

    const togglePopup = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setCoords({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX - 200 // Align somewhat left or center? Logic below
            })
            // Simple logic: if rect.left + 256 > window.width, shift left. 
            // For simplicity, let's align right edge to button right edge?
            // rect.right - 256

            // Let's use simple left align for now, checking bounds later if needed.
            // Or better: rect.right - width (256px)
            setCoords({
                top: rect.bottom + window.scrollY + 5,
                left: Math.max(10, rect.right + window.scrollX - 260) // Align roughly to right
            })
        }
        setIsOpen(!isOpen)
    }

    const handleSave = async () => {
        setIsUpdating(true)
        try {
            const { error } = await supabase
                .from('student_overall_scores')
                .update({
                    interview_date: date ? new Date(date).toISOString() : null,
                    interview_status: date ? 'scheduled' : 'pending' // Auto-update status
                })
                .eq('id', scoreId)

            if (error) throw error

            setIsOpen(false)
            router.refresh()
        } catch (error) {
            console.error('Error updating date:', error)
            alert('Failed to update date')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <>
            <button
                ref={buttonRef}
                onClick={togglePopup}
                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${date ? 'text-[#C9A961]' : 'text-gray-400'}`}
            >
                <CalendarIcon className="h-4 w-4" />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        style={{ top: coords.top, left: coords.left }}
                        className="fixed z-50 w-64 p-4 bg-white rounded-lg shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm text-gray-900">Schedule Interview</h4>
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded p-2 focus:border-[#C9A961] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isUpdating}
                                    className="px-3 py-1.5 text-xs font-medium bg-[#C9A961] text-white rounded hover:bg-[#B89648] flex items-center gap-1"
                                >
                                    {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    )
}
