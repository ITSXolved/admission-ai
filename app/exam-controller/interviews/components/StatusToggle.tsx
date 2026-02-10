'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-800' },
    { value: 'waiting_list', label: 'Waiting List', color: 'bg-orange-100 text-orange-800' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
    { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
]

export default function StatusToggle({
    scoreId,
    initialStatus
}: {
    scoreId: string
    initialStatus: string
}) {
    const [status, setStatus] = useState(initialStatus || 'pending')
    const [isUpdating, setIsUpdating] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const router = useRouter()
    const supabase = createClient()
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Handle outside click to close dropdown (not needed for portal if using backdrop, or global click listener)
    // For fixed dropdown, we can use a global listener or a full screen transparent backdrop.
    // Backdrop is easier.

    const toggleDropdown = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setCoords({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX
            })
        }
        setIsOpen(!isOpen)
    }

    const handleSelect = async (newStatus: string) => {
        if (newStatus === status) {
            setIsOpen(false)
            return
        }

        setIsUpdating(true)
        try {
            const { error } = await supabase
                .from('student_overall_scores')
                .update({ interview_status: newStatus })
                .eq('id', scoreId)

            if (error) throw error

            setStatus(newStatus)
            router.refresh()
            setIsOpen(false)
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update status')
        } finally {
            setIsUpdating(false)
        }
    }

    const currentOption = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0]

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => !isUpdating && toggleDropdown()}
                disabled={isUpdating}
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity focus:outline-none ${currentOption.color} ${isUpdating ? 'opacity-50' : ''}`}
            >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : currentOption.label}
                <ChevronDown className="h-3 w-3 opacity-50" />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        style={{ top: coords.top, left: coords.left }}
                        className="fixed z-50 w-32 bg-white shadow-lg rounded-md ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    >
                        <div className="py-1">
                            {STATUS_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${status === option.value ? 'bg-gray-50 font-medium' : ''}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    )
}
