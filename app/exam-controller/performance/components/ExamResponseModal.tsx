'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Award, BookOpen, AlertCircle, X, Loader2 } from 'lucide-react'

export default function ExamResponseModal({
    isOpen,
    onClose,
    studentId,
    examSessionId,
    studentName
}: {
    isOpen: boolean
    onClose: () => void
    studentId: string
    examSessionId: string
    studentName: string
}) {
    const [scoreData, setScoreData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [mcqResponses, setMcqResponses] = useState<any[]>([])
    const [writtenResponses, setWrittenResponses] = useState<any[]>([])
    const [error, setError] = useState<any>(null)

    useEffect(() => {
        if (isOpen && studentId && examSessionId) {
            fetchResults()
        }
    }, [isOpen, studentId, examSessionId])

    const fetchResults = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const supabase = createClient()

            // 1. Fetch Overall Score & Attempt ID
            const { data: score, error: scoreError } = await supabase
                .from('student_overall_scores')
                .select('*')
                .eq('student_id', studentId)
                .eq('exam_session_id', examSessionId)
                .single()

            if (scoreError) throw scoreError
            setScoreData(score)

            // Get attempt_id from score or fetch it separately if not linked directly
            let attemptId = score.attempt_id

            // If attempt_id is missing, try to fetch it but DON'T FAIL the whole modal if not found
            if (!attemptId) {
                console.log(`Attempt ID not in score. Fetching via API for student: ${studentId}, session: ${examSessionId}`)

                try {
                    // Fallback to API route to bypass RLS
                    const response = await fetch('/api/exams/get-attempt-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ student_id: studentId, exam_session_id: examSessionId })
                    })

                    if (!response.ok) {
                        // Just log warning, don't throw
                        console.warn('Could not fetch attempt ID via API:', await response.text())
                    } else {
                        const data = await response.json()
                        attemptId = data.attempt_id
                        console.log(`Found attempt ID via API: ${attemptId}`)
                    }
                } catch (apiErr) {
                    console.warn('Error calling get-attempt-id API:', apiErr)
                }
            }

            if (!attemptId) {
                console.warn('No attempt ID found. Showing score summary only.')
                setMcqResponses([])
                setWrittenResponses([])
                return // Stop here, don't try to fetch details
            }

            // 2. Fetch Detailed Responses
            // MCQ
            const { data: mcq, error: mcqError } = await supabase
                .from('student_mcq_responses')
                .select(`
                    *,
                    exam_questions (
                        marks,
                        question_bank (
                            question_text,
                            options,
                            correct_answer
                        )
                    )
                `)
                .eq('attempt_id', attemptId)

            if (mcqError) {
                console.error("Error fetching MCQ responses:", mcqError)
                // Don't throw, just empty array
                setMcqResponses([])
            } else {
                setMcqResponses(mcq || [])
            }

            // Written
            const { data: written, error: writtenError } = await supabase
                .from('student_written_responses')
                .select(`
                    *,
                    exam_questions (
                        marks,
                        question_bank (
                            question_text
                        )
                    ),
                    written_evaluations (*)
                `)
                .eq('attempt_id', attemptId)

            if (writtenError) {
                console.error("Error fetching Written responses:", writtenError)
                setWrittenResponses([])
            } else {
                setWrittenResponses(written || [])
            }

        } catch (err: any) {
            console.error('Error fetching exam results:', err)
            setError(err.message || 'Failed to load results')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null
    if (typeof document === 'undefined') return null

    return createPortal(
        <>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b bg-gray-50/50 rounded-t-xl">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Exam Score Card</h2>
                            <p className="text-sm text-gray-500">Candidate: {studentName}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-[#C9A961]" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 text-red-500">
                                <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                                <p>{error}</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* 1. Score Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-[#C9A961] to-[#B89648] p-6 rounded-xl text-white shadow-md">
                                        <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">Total Score</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-bold">{Number(scoreData?.total_weighted_score || 0).toFixed(1)}</span>
                                            <span className="text-white/70">/ {scoreData?.total_possible_marks}</span>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className="h-5 w-5 text-blue-500" />
                                            <h3 className="font-bold text-gray-900">MCQ Score</h3>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {Number(scoreData?.mcq_score || 0).toFixed(1)}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {mcqResponses.length > 0
                                                ? `${mcqResponses.filter(r => r.is_correct).length} / ${mcqResponses.length} Correct`
                                                : 'Details unavailable'}
                                        </p>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <BookOpen className="h-5 w-5 text-purple-500" />
                                            <h3 className="font-bold text-gray-900">Written Score</h3>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {Number(scoreData?.written_score || 0).toFixed(1)}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Evaluated by AI & Reviewer
                                        </p>
                                    </div>
                                </div>

                                {/* Warning for Missing Details */}
                                {mcqResponses.length === 0 && writtenResponses.length === 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                                        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                                        <h3 className="text-lg font-semibold text-yellow-800">Detailed Responses Unavailable</h3>
                                        <p className="text-yellow-700 max-w-lg mx-auto mt-1">
                                            The detailed answer sheet for this exam session could not be retrieved. This may happen if the exam attempt data was incomplete or deleted, but the score record remains.
                                        </p>
                                    </div>
                                )}

                                {/* 2. MCQ Details */}
                                {mcqResponses.length > 0 && (
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                        <div className="p-4 bg-gray-50 border-b font-semibold text-gray-700">
                                            MCQ Responses
                                        </div>

                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50/80 text-xs font-bold text-gray-500 uppercase border-b">
                                            <div className="col-span-1 text-center">#</div>
                                            <div className="col-span-5">Question</div>
                                            <div className="col-span-2">Selected</div>
                                            <div className="col-span-2">Correct</div>
                                            <div className="col-span-2 text-right">Marks</div>
                                        </div>

                                        <div className="divide-y">
                                            {mcqResponses.map((resp, i) => {
                                                // @ts-ignore
                                                const q = resp.exam_questions?.question_bank
                                                if (!q) return null
                                                const isCorrect = resp.is_correct

                                                return (
                                                    <div key={resp.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50/50 items-start text-sm">
                                                        <div className="col-span-1 text-center font-bold text-gray-400">{i + 1}</div>
                                                        <div className="col-span-5 font-medium text-gray-900">{q.question_text}</div>
                                                        <div className={`col-span-2 font-medium ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                                            {resp.selected_answer}
                                                        </div>
                                                        <div className="col-span-2 text-gray-500">
                                                            {q.correct_answer}
                                                        </div>
                                                        <div className="col-span-2 text-right font-bold text-gray-900">
                                                            {resp.marks_obtained || 0}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Written Details */}
                                {writtenResponses.length > 0 && (
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                        <div className="p-4 bg-gray-50 border-b font-semibold text-gray-700">
                                            Written Responses
                                        </div>
                                        <div className="divide-y">
                                            {writtenResponses.map((resp, i) => {
                                                // @ts-ignore
                                                const q = resp.exam_questions?.question_bank
                                                const evalData = Array.isArray(resp.written_evaluations) ? resp.written_evaluations[0] : resp.written_evaluations
                                                const score = Number(evalData?.total_score || 0)

                                                return (
                                                    <div key={resp.id} className="p-6 hover:bg-gray-50/50">
                                                        <div className="flex gap-4">
                                                            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-purple-100 rounded-full text-sm font-bold text-purple-600">
                                                                {i + 1}
                                                            </span>
                                                            <div className="flex-1 space-y-4">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="font-medium text-gray-900">{q?.question_text}</p>
                                                                    <span className="flex-shrink-0 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                                                                        {score} / {resp.exam_questions?.marks}
                                                                    </span>
                                                                </div>

                                                                {/* Images */}
                                                                {resp.image_urls?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {resp.image_urls.map((url: string, idx: number) => (
                                                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative group w-24 h-24 rounded-lg border overflow-hidden bg-gray-100">
                                                                                <img src={url} alt="Answer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* AI Feedback */}
                                                                {evalData && (
                                                                    <div className="bg-blue-50/60 rounded-lg p-4 border border-blue-100/60 text-sm">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <Award className="h-4 w-4 text-blue-600" />
                                                                            <span className="font-bold text-blue-800 uppercase text-xs tracking-wider">AI Evaluation</span>
                                                                        </div>
                                                                        <p className="text-blue-900/80 leading-relaxed">{evalData.feedback}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
