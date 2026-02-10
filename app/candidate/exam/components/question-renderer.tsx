import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

interface QuestionRendererProps {
    question: any
    questionIndex: number
    totalQuestions: number
}

export function QuestionRenderer({ question, questionIndex, totalQuestions }: QuestionRendererProps) {
    if (!question) return null

    const { question_bank } = question

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                    Question {questionIndex + 1} of {totalQuestions}
                </CardTitle>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {question.marks} Marks
                </span>
            </CardHeader>
            <CardContent>
                <div className="mt-4">
                    {question_bank.question_image_url && (
                        <div className="mb-4">
                            <img
                                src={question_bank.question_image_url}
                                alt="Question Image"
                                className="max-h-64 object-contain rounded-lg border border-gray-200"
                            />
                        </div>
                    )}
                    <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
                        {question_bank.question_text}
                    </h3>

                    {/* Render basic instructions based on type */}
                    <p className="mt-2 text-sm text-gray-500 italic">
                        {question_bank.question_type === 'mcq' && 'Select the correct option below.'}
                        {question_bank.question_type === 'written' && 'Type your answer in the box below.'}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
