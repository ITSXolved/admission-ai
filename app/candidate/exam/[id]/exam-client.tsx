
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Clock, CheckCircle2, AlertTriangle, Image as ImageIcon, Save, Loader2, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react"
import { ResponseRecorder } from '../components/response-recorder'
import { ResultSummary } from '../components/result-summary'
import { QuestionRenderer } from '../components/question-renderer'

interface Question {
    id: string
    question_bank: {
        id: string
        question: string
        type: 'mcq' | 'descriptive' | 'written'
        options?: any
        marks: number
        subject?: string
    }
    marks: number
}

interface ExamClientProps {
    session: any
    attempt: any
    subSessions: any[]
}

export default function ExamClient({ session, attempt, subSessions }: ExamClientProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [timeLeft, setTimeLeft] = useState<number>(0)

    // Flatten questions for easier navigation
    // We filter out sub-sessions that are NOT 'mcq' or 'written' for this renderer
    // (Cognitive tests are handled separately usually)
    const allQuestions = useMemo(() => {
        const questions: any[] = []
        if (!subSessions) return []

        subSessions.forEach(sub => {
            if (sub.session_type !== 'mcq' && sub.session_type !== 'written') return

            // 1. Questions linked to Subjects
            if (sub.exam_subjects) {
                sub.exam_subjects.forEach((subject: any) => {
                    if (subject.exam_questions) {
                        subject.exam_questions.forEach((q: any) => {
                            questions.push({
                                ...q,
                                sub_session_name: sub.name,
                                subject_name: subject.name
                            })
                        })
                    }
                })
            }

            // 2. Questions linked directly to Sub-Session (without Subject)
            if (sub.exam_questions) {
                sub.exam_questions.forEach((q: any) => {
                    // Check if already added (in case it has both IDs)
                    if (!questions.find(existing => existing.id === q.id)) {
                        questions.push({
                            ...q,
                            sub_session_name: sub.name,
                            subject_name: 'General'
                        })
                    }
                })
            }
        })

        console.log('All Questions flattened:', questions)
        // Do NOT sort globally by sequence_order, as that mixes questions from different sub-sessions.
        // The subSessions are already ordered by sequence_order from the API.
        // Questions within a sub-session are added in order.
        return questions
    }, [subSessions])

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [responses, setResponses] = useState<Record<string, any>>({})
    const [responsesLoaded, setResponsesLoaded] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [submissionResult, setSubmissionResult] = useState<any>(null)
    const supabase = createClient()

    // Initialize responses
    useEffect(() => {
        const fetchResponses = async () => {
            // Fetch MCQ responses
            const { data: mcqResponses } = await supabase
                .from('student_mcq_responses')
                .select('*')
                .eq('attempt_id', attempt.id)

            // Fetch Written responses
            const { data: writtenResponses } = await supabase
                .from('student_written_responses')
                .select('*')
                .eq('attempt_id', attempt.id)


            const responseMap: Record<string, any> = {}
            mcqResponses?.forEach(r => {
                responseMap[r.question_id] = r
            })
            writtenResponses?.forEach(r => {
                responseMap[r.question_id] = r
            })

            setResponses(responseMap)
            setResponsesLoaded(true)
        }

        fetchResponses()
    }, [attempt.id, supabase])


    // Calculate initial time left (Keep existing logic)
    useEffect(() => {
        if (!attempt?.started_at) return

        const startTime = new Date(attempt.started_at).getTime()
        const durationMs = session.duration_minutes * 60 * 1000
        const endTime = startTime + durationMs
        const now = new Date().getTime()

        const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
        setTimeLeft(remaining)

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    handleSubmitExam() // Auto submit
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [attempt, session.duration_minutes])

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const handleSubmitExam = async () => {
        if (!confirm('Are you sure you want to finish the exam? You cannot resume after submitting.')) return

        setIsLoading(true)
        try {
            // Call Submit API
            const response = await fetch('/api/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attempt_id: attempt.id })
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Submission failed')
            }

            // Success - Show Results locally instead of redirecting immediately
            if (response.ok) {
                const data = await response.json()
                setSubmissionResult(data)
                setIsSubmitted(true)
            } else {
                throw new Error('Submission failed')
            }

            // router.push('/candidate/dashboard') // Removed immediate redirect
        } catch (error) {
            console.error('Error submitting exam:', error)
            alert('Failed to submit exam. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSubmitted && submissionResult) {
        return <ResultSummary scores={submissionResult.scores} breakdown={submissionResult.breakdown} />
    }

    const handleAnswerSaved = (questionId: string, answerValue: any) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                selected_answer: answerValue // Update local state for immediate feedback if needed
            }
        }))
    }

    const currentQuestion = allQuestions[currentQuestionIndex]

    return (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
            {/* Header / Top Bar */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{session.name}</h1>
                        <p className="text-sm text-gray-500">
                            Question {currentQuestionIndex + 1} of {allQuestions.length} • {currentQuestion?.subject_name || 'General'}
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className={`flex items - center gap - 2 px - 4 py - 2 rounded - lg font - mono text - xl font - bold ${timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
                            } `}>
                            <Clock className="h-5 w-5" />
                            {formatTime(timeLeft)}
                        </div>

                        <Button
                            onClick={handleSubmitExam}
                            disabled={isLoading}
                            variant="default"
                            className="bg-[#C9A961] hover:bg-[#B89648] text-white"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isLoading ? 'Submitting...' : 'Submit Exam'}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-4xl mx-auto w-full p-6 pb-24">
                {!responsesLoaded ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">Loading your exam...</span>
                    </div>
                ) : allQuestions.length === 0 ? (
                    <div className="text-center p-12">
                        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900">No questions found</h2>
                        <p className="text-gray-500">Please contact the administrator.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Question Area */}
                        <QuestionRenderer
                            question={currentQuestion}
                            questionIndex={currentQuestionIndex}
                            totalQuestions={allQuestions.length}
                        />

                        {/* Response Area */}
                        <div className="bg-white rounded-lg border shadow-sm p-6">
                            <h3 className="text-md font-semibold text-gray-800 mb-4">Your Answer</h3>
                            <ResponseRecorder
                                attemptId={attempt.id}
                                question={currentQuestion}
                                subjectName={currentQuestion.subject_name || 'English'}
                                initialAnswer={responses[currentQuestion.id]}
                                onAnswerSaved={handleAnswerSaved}
                            />
                        </div>
                    </div>
                )}
            </main>

            {/* Footer Navigation */}
            <footer className="bg-white border-t border-gray-200 px-6 py-4 sticky bottom-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>

                    <div className='text-sm text-gray-500'>
                        {responses[currentQuestion?.id] ?
                            <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Answered</span> :
                            <span className="text-gray-400">Not answered yet</span>
                        }
                    </div>

                    <Button
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(allQuestions.length - 1, prev + 1))}
                        disabled={currentQuestionIndex === allQuestions.length - 1}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </footer>
        </div>
    )
}

