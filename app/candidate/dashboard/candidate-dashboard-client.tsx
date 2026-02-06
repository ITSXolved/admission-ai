'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, FileText, GraduationCap, PlayCircle, LogOut, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ResultsView from './components/ResultsView'

export default function CandidateDashboardClient({
    student,
    activeExam,
    attempt
}: {
    student: any
    activeExam: any
    attempt: any
}) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleStartExam = async () => {
        setIsLoading(true)
        try {
            const supabase = createClient()

            // Only proceed if there's an assigned attempt
            if (!attempt) {
                alert('No exam has been assigned to you yet. Please contact the exam controller.')
                return
            }

            if (attempt.status === 'not_started') {
                // Start the assigned attempt via RPC (secure)
                console.log('Calling start_student_exam with attempt ID:', attempt.id)
                const { data, error } = await supabase
                    .rpc('start_student_exam', {
                        p_attempt_id: attempt.id
                    })

                console.log('RPC Response:', { data, error })
                if (error) throw error
                router.push(`/candidate/exam/${activeExam.id}`)
            } else {
                // Resume existing attempt
                router.push(`/candidate/exam/${activeExam.id}`)
            }
        } catch (error: any) {
            console.error('Error starting exam:', error)
            console.error('Attempt object:', attempt)
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            })

            // Temporarily disabled to see actual error
            // if (error.message?.includes('duplicate key') || error.code === '23505') {
            //      // Try to recover by reloading to fetch the existing attempt
            //      window.location.reload()
            //      return
            // }

            alert(`Failed to start exam: ${error.message || JSON.stringify(error)}`)
        } finally {
            setIsLoading(false)
        }
    }

    const getExamStatusDisplay = () => {
        if (!attempt) return { label: 'Not Started', color: 'text-gray-600', bg: 'bg-gray-100' }

        switch (attempt.status) {
            case 'completed':
                return { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' }
            case 'in_progress':
                return { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' }
            case 'expired':
                return { label: 'Expired', color: 'text-red-600', bg: 'bg-red-100' }
            default:
                return { label: attempt.status, color: 'text-gray-600', bg: 'bg-gray-100' }
        }
    }

    const examStatus = getExamStatusDisplay()
    const now = new Date()
    const isExamActive = activeExam &&
        new Date(activeExam.start_date) <= now &&
        new Date(activeExam.end_date) >= now

    return (
        <div className="space-y-8">
            {/* Logout Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[#C9A961] hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-[#C9A961] to-[#B89648] rounded-lg text-white">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Application Status</p>
                            <p className="text-lg font-bold text-gray-900 capitalize">
                                {student.overall_status?.replace('_', ' ') || 'Applied'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-lg text-white">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Applying For</p>
                            <p className="text-lg font-bold text-gray-900">
                                Grade {student.applying_grade}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${attempt?.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'} text-white`}>
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Exam Result</p>
                            <p className="text-lg font-bold text-gray-900">
                                {attempt?.status === 'completed' ? 'Submitted' : 'Pending'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Exam Card */}
            {activeExam ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-900">{activeExam.name}</h2>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${examStatus.bg} ${examStatus.color}`}>
                                        {examStatus.label}
                                    </span>
                                </div>
                                <p className="text-gray-500 max-w-2xl">{activeExam.description}</p>
                            </div>

                            {/* Timer / Schedule Info */}
                            <div className="flex flex-col items-end text-right">
                                <div className="flex items-center gap-2 text-gray-600 mb-1">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        {new Date(activeExam.start_date).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        {activeExam.duration_minutes} Minutes
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Instructions or Status Message */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-8">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                                Important Instructions
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
                                <li>Ensure you have a stable internet connection.</li>
                                <li>Do not refresh the page during the exam.</li>
                                <li>The exam consists of MCQ, Written, and Cognitive sections.</li>
                                <li>The timer will start as soon as you click the button below.</li>
                            </ul>
                        </div>

                        {/* Action Button */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            {(!attempt || attempt.status === 'in_progress' || attempt.status === 'not_started') && isExamActive ? (
                                <button
                                    onClick={handleStartExam}
                                    disabled={isLoading}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#C9A961] hover:bg-[#B89648] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                                >
                                    {isLoading ? (
                                        <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <PlayCircle className="h-6 w-6" />
                                            {attempt ? 'Resume Exam' : 'Start Exam Now'}
                                        </>
                                    )}
                                </button>
                            ) : null}

                            {attempt?.status === 'completed' && (
                                <div className="flex items-center gap-3 text-green-600 bg-green-50 px-6 py-4 rounded-xl border border-green-100 w-full sm:w-auto">
                                    <CheckCircle className="h-6 w-6" />
                                    <span className="font-medium">You have successfully completed this exam.</span>
                                </div>
                            )}

                            {!isExamActive && !attempt && (
                                <div className="flex items-center gap-3 text-orange-600 bg-orange-50 px-6 py-4 rounded-xl border border-orange-100 w-full sm:w-auto">
                                    <AlertCircle className="h-6 w-6" />
                                    <span className="font-medium">
                                        This exam is not currently active. Please check the scheduled time.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Exams</h3>
                    <p className="text-gray-500">
                        There are no entrance exams scheduled for you at this time.
                    </p>
                </div>
            )}

            {/* Exam Results View */}
            {attempt?.status === 'completed' && activeExam && (
                <div className="mt-12 animate-fade-in">
                    <ResultsView
                        studentId={student.id}
                        examSessionId={activeExam.id}
                        attemptId={attempt.id}
                    />
                </div>
            )}
        </div>
    )
}
