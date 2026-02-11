'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Loader2, IndianRupee, CreditCard, Building2, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdmissionDetails({
    scoreId,
    details
}: {
    scoreId: string
    details: {
        fee_agreed?: number | null,
        payment_mode?: 'full' | 'installment' | null,
        installments_count?: number | null,
        residence_type?: 'hosteller' | 'day_scholar' | null
    }
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom')
    const router = useRouter()
    const supabase = createClient()
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Form State
    const [formData, setFormData] = useState({
        fee_agreed: details.fee_agreed?.toString() || '',
        payment_mode: details.payment_mode || 'full',
        installments_count: details.installments_count || 2,
        residence_type: details.residence_type || 'day_scholar'
    })

    useEffect(() => {
        // Sync props to state when popup opens or props change
        setFormData({
            fee_agreed: details.fee_agreed?.toString() || '',
            payment_mode: details.payment_mode || 'full',
            installments_count: details.installments_count || 2,
            residence_type: details.residence_type || 'day_scholar'
        })
    }, [details, isOpen])

    // Handle scroll/resize to update position if open
    useEffect(() => {
        if (!isOpen) return

        const updatePosition = () => {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect()
                const scrollY = window.scrollY
                const scrollX = window.scrollX
                const viewportHeight = window.innerHeight

                // Check space below
                const spaceBelow = viewportHeight - rect.bottom
                const popupHeight = 450 // Approximate max height

                let top = 0
                let left = Math.max(10, rect.right + scrollX - 320)
                let newPlacement: 'bottom' | 'top' = 'bottom'

                if (spaceBelow < popupHeight && rect.top > popupHeight) {
                    // Position above
                    top = rect.top + scrollY - 5
                    newPlacement = 'top'
                } else {
                    // Position below (default)
                    top = rect.bottom + scrollY + 5
                    newPlacement = 'bottom'
                }

                setCoords({ top, left })
                setPlacement(newPlacement)
            }
        }

        updatePosition()
        window.addEventListener('scroll', updatePosition, true)
        window.addEventListener('resize', updatePosition)

        return () => {
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
        }
    }, [isOpen])

    const togglePopup = () => {
        setIsOpen(!isOpen)
    }

    const handleSave = async () => {
        setIsUpdating(true)
        try {
            const updates: any = {
                fee_agreed: formData.fee_agreed ? parseFloat(formData.fee_agreed) : null,
                payment_mode: formData.payment_mode,
                residence_type: formData.residence_type
            }

            if (formData.payment_mode === 'installment') {
                updates.installments_count = formData.installments_count
            } else {
                updates.installments_count = null
            }

            const { error } = await supabase
                .from('student_overall_scores')
                .update(updates)
                .eq('id', scoreId)

            if (error) throw error

            setIsOpen(false)
            router.refresh()
        } catch (error) {
            console.error('Error updating admission details:', error)
            alert('Failed to update details')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <>
            <button
                ref={buttonRef}
                onClick={togglePopup}
                className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${details.fee_agreed ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}
                title="Admission Details"
            >
                <IndianRupee className="h-4 w-4" />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        style={{
                            top: coords.top,
                            left: coords.left,
                            transform: placement === 'top' ? 'translateY(-100%)' : 'none'
                        }}
                        className="absolute z-50 w-80 p-5 bg-white rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 border-b pb-2">Admission Details</h4>

                            {/* Fee Agreed */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Agreed Fee</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.fee_agreed}
                                        onChange={(e) => setFormData({ ...formData, fee_agreed: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Payment Mode */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Payment Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, payment_mode: 'full' })}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${formData.payment_mode === 'full' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Full Payment
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, payment_mode: 'installment' })}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${formData.payment_mode === 'installment' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Installment
                                    </button>
                                </div>
                            </div>

                            {/* Installments (Conditional) */}
                            {formData.payment_mode === 'installment' && (
                                <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                    <label className="text-xs font-medium text-blue-700">Number of Installments</label>
                                    <div className="flex gap-3">
                                        {[2, 3].map((count) => (
                                            <label key={count} className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="installments"
                                                    checked={formData.installments_count == count}
                                                    onChange={() => setFormData({ ...formData, installments_count: count })}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700">{count} Installments</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Residence Type */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500">Residence Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, residence_type: 'day_scholar' })}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${formData.residence_type === 'day_scholar' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Day Scholar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, residence_type: 'hosteller' })}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${formData.residence_type === 'hosteller' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Hosteller
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isUpdating}
                                    className="px-4 py-1.5 text-xs font-medium bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-1 shadow-sm"
                                >
                                    {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Save Details
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
