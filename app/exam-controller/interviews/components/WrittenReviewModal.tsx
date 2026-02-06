'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Loader2, X, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WrittenReviewModal({
    studentDetails,
    examSessionId,
    isOpen,
    onClose
}: {
    studentDetails: { id: string, name: string },
    examSessionId: string,
    isOpen: boolean,
    onClose: () => void
}) {
    const [responses, setResponses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null) // Response ID being updated
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        if (isOpen && studentDetails.id && examSessionId) {
            fetchResponses()
        }
    }, [isOpen, studentDetails.id, examSessionId])

    const fetchResponses = async () => {
        setLoading(true)
        try {
            // 1. Get Attempt ID
            const { data: attempt } = await supabase
                .from('student_exam_attempts')
                .select('id')
                .eq('student_id', studentDetails.id)
                .eq('exam_session_id', examSessionId)
                .single()

            if (!attempt) throw new Error('Attempt not found')

            // 2. Get Responses with Question Text and Existing Evaluation
            const { data: writtenResponses, error } = await supabase
                .from('student_written_responses')
                .select(`
                    id,
                    question_id,
                    image_urls,
                    attempt_id,
                    exam_questions!inner (
                        marks,
                        question_bank!inner (question_text)
                    ),
                    written_evaluations (
                        total_score,
                        feedback,
                        evaluator_type
                    )
                `)
                .eq('attempt_id', attempt.id)

            if (error) throw error

            setResponses(writtenResponses || [])

        } catch (error) {
            console.error('Error fetching responses:', error)
            alert('Failed to load written responses')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateScore = async (responseId: string, attemptId: string, newScore: string) => {
        const score = parseFloat(newScore)
        if (isNaN(score)) return

        setUpdating(responseId)
        try {
            const res = await fetch('/api/update-written-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response_id: responseId,
                    new_score: score,
                    attempt_id: attemptId
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Update failed')

            // Update local state to reflect change immediately
            setResponses(prev => prev.map(r => {
                if (r.id === responseId) {
                    return {
                        ...r,
                        written_evaluations: [
                            {
                                ...r.written_evaluations?.[0],
                                total_score: score,
                                evaluator_type: 'human'
                            }
                        ]
                    }
                }
                return r
            }))

            router.refresh() // Refresh parent page stats

        } catch (error) {
            console.error('Error updating score:', error)
            alert('Failed to update score')
        } finally {
            setUpdating(null)
        }
    }

    if (!isOpen) return null
    if (typeof document === 'undefined') return null

    return createPortal(
        <>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Written Responses</h2>
                            <p className="text-sm text-gray-500">Reviewing: {studentDetails.name}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : responses.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>No written responses found for this student.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {responses.map((resp, index) => {
                                    // @ts-ignore
                                    const questionText = resp.exam_questions?.question_bank?.question_text
                                    // @ts-ignore
                                    const maxMarks = resp.exam_questions?.marks
                                    const evaluation = resp.written_evaluations?.[0]
                                    const currentScore = evaluation?.total_score ?? 0

                                    return (
                                        <div key={resp.id} className="border rounded-xl overflow-hidden bg-gray-50/50">
                                            {/* Question Header */}
                                            <div className="bg-white p-4 border-b flex justify-between gap-4">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Question {index + 1}</span>
                                                    <p className="text-gray-900 font-medium">{questionText}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-xs text-gray-500 block">Max Marks</span>
                                                    <span className="font-bold text-gray-900">{maxMarks}</span>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6 p-6">
                                                {/* Left: Images */}
                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                                                        Student Answer
                                                    </h4>
                                                    <div className="grid gap-4">
                                                        {resp.image_urls?.map((url: string, i: number) => (
                                                            <a
                                                                key={i}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block group relative rounded-lg overflow-hidden border bg-white hover:border-blue-500 transition-colors"
                                                            >
                                                                <img
                                                                    src={url}
                                                                    alt={`Page ${i + 1}`}
                                                                    className="w-full h-auto object-contain max-h-[400px]"
                                                                    loading="lazy"
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Right: Evaluation */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">AI Feedback</h4>
                                                        <div className="bg-white p-4 rounded-lg border text-sm text-gray-600 leading-relaxed">
                                                            {evaluation?.feedback || 'No feedback available.'}
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-4 rounded-lg border space-y-3 shadow-sm">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-sm font-semibold text-gray-900">Score</h4>
                                                            {evaluation?.evaluator_type === 'human' && (
                                                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                                                                    Edited
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={maxMarks}
                                                                step="0.5"
                                                                defaultValue={currentScore}
                                                                onBlur={(e) => handleUpdateScore(resp.id, resp.attempt_id, e.target.value)}
                                                                className="w-24 text-2xl font-bold p-2 border rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center"
                                                            />
                                                            <span className="text-xl text-gray-400 font-light">/ {maxMarks}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Edit value to override AI score
                                                        </p>
                                                        {updating === resp.id && (
                                                            <div className="text-xs text-blue-600 flex items-center gap-1.5 animate-pulse">
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                Saving...
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
