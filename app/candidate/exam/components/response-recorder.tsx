'use client'

import { useState, useEffect } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Upload, Trash2 } from "lucide-react"

interface ResponseRecorderProps {
    attemptId: string
    question: any
    subjectName?: string
    initialAnswer?: any
    onAnswerSaved?: (questionId: string, answer: any) => void
}

export function ResponseRecorder({ attemptId, question, subjectName, initialAnswer, onAnswerSaved }: ResponseRecorderProps) {
    const [answer, setAnswer] = useState<string | string[]>(
        initialAnswer?.selected_answer || initialAnswer?.image_urls || ''
    )
    const [isSaving, setIsSaving] = useState(false)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [evaluationResult, setEvaluationResult] = useState<any>(null)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const supabase = createClient()

    // Update local state when question changes
    useEffect(() => {
        setAnswer(
            initialAnswer?.selected_answer || initialAnswer?.image_urls || ''
        )
        // Reset evaluation state on question change
        setEvaluationResult(null)
    }, [initialAnswer, question.id])

    const handleSave = async (value: string) => {
        if (!value) return

        setIsSaving(true)
        try {
            if (question.question_bank.type === 'mcq') {
                const { error } = await supabase
                    .from('student_mcq_responses')
                    .upsert({
                        attempt_id: attemptId,
                        question_id: question.id,
                        selected_answer: value,
                        answered_at: new Date().toISOString()
                    }, { onConflict: 'attempt_id,question_id' })

                if (error) throw error
            }

            setLastSaved(new Date())
            if (onAnswerSaved) onAnswerSaved(question.id, value)

        } catch (error) {
            console.error('Error saving answer:', error)
        } finally {
            setIsSaving(false)
        }
    }

    // Debounce for text inputs (if we add text input for written later)
    // For MCQ, we save immediately on selection
    const handleValueChange = (val: string) => {
        setAnswer(val)
        handleSave(val)
    }

    if (question.question_bank.type === 'mcq') {
        const options = question.question_bank.options

        // entries...
        let optionEntries: [string, any][] = []
        if (options && typeof options === 'object') {
            optionEntries = Object.entries(options)
        }

        return (
            <div className="space-y-4 mt-6">
                <RadioGroup value={answer as string} onValueChange={handleValueChange}>
                    {optionEntries.map(([key, value]) => {
                        const optionText = typeof value === 'string' ? value : value.text
                        const optionImage = typeof value === 'string' ? null : value.image

                        return (
                            <div key={key} className={`flex items-start space-x-3 border p-4 rounded-lg cursor-pointer transition-colors ${answer === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <RadioGroupItem value={key} id={`option-${key}`} className="mt-1" />
                                <div className="flex-1">
                                    <Label htmlFor={`option-${key}`} className="cursor-pointer font-normal text-base block">
                                        <span className="font-bold mr-2 uppercase">{key}.</span>
                                        {optionText}
                                    </Label>
                                    {optionImage && (
                                        <div className="mt-2">
                                            <img
                                                src={optionImage}
                                                alt={`Option ${key}`}
                                                className="max-h-40 rounded border border-gray-200 object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </RadioGroup>

                <div className="flex items-center justify-end text-xs text-gray-400 min-h-[20px]">
                    {isSaving && <span className="flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...</span>}
                    {!isSaving && lastSaved && <span>Saved {lastSaved.toLocaleTimeString()}</span>}
                </div>
            </div>
        )
    }

    if (['written', 'fill_in_the_blank', 'pick_and_place'].includes(question.question_bank.type)) {
        const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file) return

            setIsSaving(true)
            try {
                // 1. Upload to Storage
                const fileExt = file.name.split('.').pop()
                const fileName = `${attemptId}/${question.id}/${Date.now()}.${fileExt}`
                const { error: uploadError, data } = await supabase.storage
                    .from('exam-uploads')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                // 2. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('exam-uploads')
                    .getPublicUrl(fileName)

                // 3. Update Response Table
                // Get current images first
                const currentImages = Array.isArray(answer) ? answer : []
                const newImages = [...currentImages, publicUrl]

                const { error: dbError } = await supabase
                    .from('student_written_responses')
                    .upsert({
                        attempt_id: attemptId,
                        question_id: question.id,
                        image_urls: newImages,
                        uploaded_at: new Date().toISOString()
                    }, { onConflict: 'attempt_id,question_id' })

                if (dbError) throw dbError

                setAnswer(newImages as any)
                setLastSaved(new Date())
                if (onAnswerSaved) onAnswerSaved(question.id, newImages)

                // 4. Trigger AI Evaluation
                setIsEvaluating(true)
                try {
                    const evalResponse = await fetch('/api/evaluate-written', {
                        method: 'POST',
                        body: JSON.stringify({
                            attempt_id: attemptId,
                            question_id: question.id,
                            image_urls: newImages,
                            marks_per_question: question.marks,
                            language: subjectName
                        })
                    })
                    const evalResult = await evalResponse.json()
                    console.log('Evaluation Result:', evalResult)
                    if (evalResult.evaluation) {
                        setEvaluationResult(evalResult.evaluation)
                    }
                } catch (evalErr) {
                    console.error('AI Evaluation failed:', evalErr)
                } finally {
                    setIsEvaluating(false)
                }

            } catch (error) {
                console.error('Error uploading file:', error)
                alert('Failed to upload image. Please try again.')
            } finally {
                setIsSaving(false)
            }
        }

        const handleDelete = async (urlToDelete: string) => {
            if (!confirm('Are you sure you want to delete this image?')) return

            setIsSaving(true)
            try {
                // 1. Delete from Storage
                // Extract path from URL: .../exam-uploads/attemptId/questionId/filename.ext
                // Path should be attemptId/questionId/filename.ext
                // Assumption: URL contains '/exam-uploads/'
                const pathParts = urlToDelete.split('/exam-uploads/')
                if (pathParts.length < 2) {
                    throw new Error('Invalid file URL format')
                }
                const storagePath = pathParts[1] // This gives everything after exam-uploads/ including potential query params if any (Supabase usually clean)

                // IMPORTANT: Public URLs might be cleaner or have query params.
                // Re-verify path logic.
                // Standard Supabase public URL: https://project.supabase.co/storage/v1/object/public/exam-uploads/folder/file.ext
                // So split gives the right path.

                const { error: deleteError } = await supabase.storage
                    .from('exam-uploads')
                    .remove([storagePath])

                // Note: remove might not throw error if file not found, which is fine.

                // 2. Update Database
                const currentImages = Array.isArray(answer) ? answer : []
                const newImages = currentImages.filter((url: string) => url !== urlToDelete)

                const { error: dbError } = await supabase
                    .from('student_written_responses')
                    .upsert({
                        attempt_id: attemptId,
                        question_id: question.id,
                        image_urls: newImages,
                        uploaded_at: new Date().toISOString()
                    }, { onConflict: 'attempt_id,question_id' })

                if (dbError) throw dbError

                setAnswer(newImages as any)
                if (onAnswerSaved) onAnswerSaved(question.id, newImages)

                // Reset evaluation if answer changed significantly? 
                // Yes, if images change, evaluation is potentially stale.
                setEvaluationResult(null)

            } catch (error) {
                console.error('Error deleting file:', error)
                alert('Failed to delete image.')
            } finally {
                setIsSaving(false)
            }
        }

        const uploadedImages = Array.isArray(answer) ? answer : []

        return (
            <div className="space-y-4 mt-6">
                <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isSaving || isEvaluating}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                            {isSaving ? 'Uploading...' : 'Click to upload answer sheet'}
                        </span>
                        <span className="text-xs text-gray-500">Supports JPG, PNG</span>
                    </div>
                </div>

                {/* Evaluation Feedback */}
                {isEvaluating && (
                    <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">Analyzing your answer with AI...</span>
                    </div>
                )}

                {evaluationResult && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800 text-sm">
                        <div className="font-bold mb-1">AI Evaluation Complete</div>
                        <div className="mb-2">Marks Grid: {evaluationResult.marks_assigned} / {question.marks}</div>
                        <div className="text-xs text-green-700">{evaluationResult.feedback}</div>
                    </div>
                )}

                {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        {uploadedImages.map((url: string, idx: number) => (
                            <div key={idx} className="relative group border rounded-lg overflow-hidden h-40 bg-gray-100">
                                <img src={url} alt={`Uploaded answer ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-white text-xs hover:underline bg-black/50 px-2 py-1 rounded">
                                        View
                                    </a>
                                    <button
                                        onClick={() => handleDelete(url)}
                                        className="text-white bg-red-600 hover:bg-red-700 p-1 rounded transition-colors"
                                        title="Delete Image"
                                        type="button"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-end text-xs text-gray-400 min-h-[20px]">
                    {isSaving && <span className="flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...</span>}
                    {!isSaving && lastSaved && <span>Saved {lastSaved.toLocaleTimeString()}</span>}
                </div>
            </div>
        )
    }

    return (
        <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            Response type for '{question.question_bank.type}' is under development.
        </div>
    )
}
