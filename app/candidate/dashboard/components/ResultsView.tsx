'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Award, BookOpen, AlertCircle, Clock } from 'lucide-react'

export default function ResultsView({
    studentId,
    examSessionId,
    attemptId
}: {
    studentId: string
    examSessionId: string
    attemptId: string
}) {
    const [scoreData, setScoreData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [mcqResponses, setMcqResponses] = useState<any[]>([])
    const [writtenResponses, setWrittenResponses] = useState<any[]>([])
    const [isLoadingDetails, setIsLoadingDetails] = useState(true)

    const [error, setError] = useState<any>(null)

    useEffect(() => {
        const fetchResults = async () => {
            console.log('Fetching results for:', { studentId, examSessionId, attemptId })
            const supabase = createClient()

            // 1. Fetch Overall Score
            const { data: score, error: scoreError } = await supabase
                .from('student_overall_scores')
                .select('*')
                .eq('student_id', studentId)
                .eq('exam_session_id', examSessionId)
                .single()

            if (scoreError) {
                console.error('Error fetching score:', scoreError)
                if (scoreError.code !== 'PGRST116') { // Ignore "Row not found" for now as it handles null
                    setError(scoreError)
                }
            } else {
                console.log('Score Data:', score)
            }

            setScoreData(score)

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

            setMcqResponses(mcq || [])

            // Written
            const { data: written } = await supabase
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

            console.log('Written Responses:', written)
            setWrittenResponses(written || [])
            setIsLoading(false)
            setIsLoadingDetails(false)
        }

        fetchResults()
    }, [studentId, examSessionId, attemptId])

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading results...</div>

    if (error) {
        return (
            <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-900 mb-2">Error Loading Results</h3>
                <p className="text-red-700 mb-4">{error.message}</p>
                <div className="bg-white p-4 rounded text-xs text-left overflow-auto max-h-40 border border-red-200">
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            </div>
        )
    }

    if (!scoreData) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Results Processing</h3>
                <p className="text-gray-500">Your exam has been submitted and is currently being evaluated. Please check back shortly.</p>
                <div className="mt-4 text-xs text-gray-400">
                    Attempt ID: {attemptId} <br />
                    Student ID: {studentId}
                </div>
            </div>
        )
    }
    const breakdown = scoreData.score_breakdown || {}
    const languages = breakdown.languages || {}

    return (
        <div className="space-y-8">
            {/* 1. Score Summary Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-[#C9A961] to-[#B89648] p-6 text-white text-center">
                    <h2 className="text-2xl font-bold mb-1">Exam Results</h2>
                    <p className="text-white/80 text-sm">Session Completed</p>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <div className="py-4 md:py-0">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Score</p>
                        <p className="text-4xl font-extrabold text-gray-900">
                            {Number(scoreData.total_weighted_score).toFixed(1)}
                            <span className="text-lg text-gray-400 font-normal ml-1">/ {scoreData.total_possible_marks}</span>
                        </p>
                    </div>
                    <div className="py-4 md:py-0">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Percentage</p>
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-500">
                            <span className="text-xl font-bold text-blue-700">{Math.round(scoreData.percentage_score)}%</span>
                        </div>
                    </div>
                    <div className="py-4 md:py-0">
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Status</p>
                        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${Number(scoreData.percentage_score) >= 40
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {Number(scoreData.percentage_score) >= 40 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* MCQ Section Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <CheckCircle className="h-6 w-6 text-blue-500" />
                        <h3 className="text-lg font-bold">MCQ Performance</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Score Obtained</span>
                            <span className="font-bold text-gray-900">{scoreData.mcq_score}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Correct Answers</span>
                            <span className="font-medium text-green-600">
                                {mcqResponses.filter(r => r.is_correct).length} / {mcqResponses.length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Written Section Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <BookOpen className="h-6 w-6 text-purple-500" />
                        <h3 className="text-lg font-bold">Written Performance</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Written Score</span>
                            <span className="font-bold text-gray-900">{Number(scoreData.written_score).toFixed(1)}</span>
                        </div>

                        <div className="pt-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Language Breakdown</p>
                            {Object.entries(languages).map(([lang, score]: [string, any]) => (
                                <div key={lang} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                    <span className="capitalize text-gray-700">{lang}</span>
                                    <span className="font-bold text-gray-900">{Number(score).toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Detailed Review Section */}
            {!isLoadingDetails && (
                <div className="space-y-8">
                    {/* MCQ Review */}
                    {mcqResponses.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 bg-gray-50 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">MCQ Review</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {mcqResponses.map((resp, index) => {
                                    const question = resp.exam_questions?.question_bank
                                    if (!question) return null

                                    const isCorrect = resp.is_correct
                                    const selectedOption = resp.selected_answer
                                    const correctOption = question.correct_answer

                                    return (
                                        <div key={resp.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-bold text-gray-600">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 mb-3">{question.question_text}</p>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                                        <div className={`p-3 rounded-lg border flex items-center justify-between ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                                                            }`}>
                                                            <span className="text-sm font-medium">
                                                                Your Answer: {selectedOption} (
                                                                {(() => {
                                                                    const opt = question.options?.[selectedOption]
                                                                    return typeof opt === 'object' ? opt?.text : opt
                                                                })() || ''}
                                                                )
                                                            </span>
                                                            {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                        </div>

                                                        {!isCorrect && (
                                                            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 flex items-center justify-between">
                                                                <span className="text-sm font-medium">
                                                                    Correct Answer: {correctOption} (
                                                                    {(() => {
                                                                        const opt = question.options?.[correctOption]
                                                                        return typeof opt === 'object' ? opt?.text : opt
                                                                    })() || ''}
                                                                    )
                                                                </span>
                                                                <CheckCircle className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 text-right">Marks: {resp.marks_obtained || 0} / {resp.exam_questions?.marks || 1}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Written Review */}
                    {writtenResponses.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 bg-gray-50 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Written Responses & AI Feedback</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {writtenResponses.map((resp, index) => {
                                    const question = resp.exam_questions?.question_bank
                                    // Handle if written_evaluations is returned as object (one-to-one) or array (one-to-many)
                                    const evaluationRaw = resp.written_evaluations
                                    const evaluation = Array.isArray(evaluationRaw) ? evaluationRaw[0] : evaluationRaw

                                    if (!question) return null

                                    return (
                                        <div key={resp.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-4 mb-6">
                                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-purple-100 rounded-full text-sm font-bold text-purple-600">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 mb-4">{question.question_text}</p>

                                                    {/* Image Display */}
                                                    {resp.image_urls && resp.image_urls.length > 0 && (
                                                        <div className="mb-4">
                                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Answer</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {resp.image_urls.map((url: string, i: number) => (
                                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity relative bg-gray-100">
                                                                        {/* Using img tag directly for external URLs if Next/Image not configured for domain */}
                                                                        <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* AI Evaluation */}
                                                    {evaluation ? (
                                                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Award className="h-5 w-5 text-blue-600" />
                                                                    <span className="font-bold text-blue-900">Score: {Number(evaluation.total_score).toFixed(1)} / {resp.exam_questions?.marks}</span>
                                                                </div>
                                                                <span className="text-xs bg-white px-2 py-1 rounded border border-blue-100 text-blue-600 font-medium">
                                                                    {evaluation.language || 'English'}
                                                                </span>
                                                            </div>

                                                            <div className="mb-3">
                                                                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Feedback</p>
                                                                <p className="text-sm text-blue-900 leading-relaxed">{evaluation.feedback}</p>
                                                            </div>

                                                            {evaluation.extracted_text && (
                                                                <div className="mt-4 pt-3 border-t border-blue-200/50">
                                                                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Transcribed Text</p>
                                                                    <p className="text-xs text-blue-800/70 font-mono bg-white/50 p-2 rounded">{evaluation.extracted_text.substring(0, 200)}...</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-center gap-2 text-gray-500 italic text-sm">
                                                            <Clock className="h-4 w-4" />
                                                            Evaluation pending...
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
    )
}
