'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface ResultSummaryProps {
    scores: {
        mcq: number
        written: number
        languages: Record<string, number>
    }
    breakdown: {
        written: {
            question_id: string
            score: number
            feedback: string
            extracted_text: string
            language: string
        }[]
    }
}

export function ResultSummary({ scores, breakdown }: ResultSummaryProps) {
    const totalScore = scores.mcq + scores.written

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Exam Submitted Successfully!</h1>
                <p className="text-gray-500">Your answers have been recorded and evaluated.</p>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Total Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-900">{totalScore.toFixed(1)}</div>
                        <p className="text-xs text-blue-600 mt-1">Combined Performance</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">MCQ Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{scores.mcq.toFixed(1)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Written Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{scores.written.toFixed(1)}</div>
                        <div className="flex gap-2 mt-2">
                            {Object.entries(scores.languages).map(([lang, score]) => (
                                <span key={lang} className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                                    {lang}: {score}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Written Feedback */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Written Assessment Feedback</h2>
                {breakdown.written.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed text-gray-500">
                        No written questions were evaluated.
                    </div>
                ) : (
                    breakdown.written.map((item, index) => (
                        <Card key={index} className="overflow-hidden">
                            <CardHeader className="bg-gray-50 py-3 border-b">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base font-medium">Question {index + 1} ({item.language})</CardTitle>
                                    <span className="font-bold text-sm bg-white px-3 py-1 rounded border">
                                        Score: {item.score}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div>
                                    <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">AI Feedback</span>
                                    <p className="text-sm text-gray-700 mt-1">{item.feedback}</p>
                                </div>
                                {item.extracted_text && (
                                    <div className="bg-yellow-50 p-3 rounded text-xs text-gray-600 border border-yellow-100">
                                        <span className="font-semibold block mb-1">Extracted Text:</span>
                                        "{item.extracted_text}"
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex justify-center pt-6">
                <button
                    onClick={() => window.location.href = '/candidate/dashboard'}
                    className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    )
}
