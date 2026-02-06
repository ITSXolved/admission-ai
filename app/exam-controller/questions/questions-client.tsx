'use client'

import { createClient } from '@/lib/supabase/client'
import { FileQuestion, Plus, Upload, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Question {
    id: string
    question_text: string
    question_type: 'mcq' | 'written' | 'cognitive'
    difficulty_level: 'easy' | 'medium' | 'hard'
    options?: any
    correct_answer?: string
    subject_id?: string
    marks?: number
    created_at: string
}

interface Subject {
    id: string
    name: string
    sub_session_id: string
}

interface SubSession {
    id: string
    name: string
    session_type: string
    exam_session_id: string
}

interface ExamSession {
    id: string
    name: string
}

interface QuestionsClientProps {
    initialQuestions: Question[]
    subjects: Subject[]
    subSessions: SubSession[]
    examSessions: ExamSession[]
    defaultSubSessionId: string | null
}

export default function QuestionsClient({ initialQuestions, subjects, subSessions, examSessions, defaultSubSessionId }: QuestionsClientProps) {
    const searchParams = useSearchParams()
    const initialExamSessionId = searchParams.get('exam_session_id') || ''

    const [questions, setQuestions] = useState<Question[]>(initialQuestions)
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>(subjects)
    const [selectedExamSessionId, setSelectedExamSessionId] = useState<string>(initialExamSessionId)
    const [selectedSubSessionId, setSelectedSubSessionId] = useState<string>(defaultSubSessionId || '')
    const [isCreatingSubject, setIsCreatingSubject] = useState(false)
    const [newSubjectName, setNewSubjectName] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [newQuestion, setNewQuestion] = useState({
        question_text: '',
        question_type: 'mcq',
        difficulty_level: 'medium',
        subject_id: '',
        marks: 1,
        options: {
            A: '',
            B: '',
            C: '',
            D: ''
        },
        correct_answer: 'A'
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question?')) return

        try {
            const { error } = await supabase
                .from('question_bank')
                .delete()
                .eq('id', id)

            if (error) throw error

            setQuestions(questions.filter(q => q.id !== id))
            router.refresh()
        } catch (error: any) {
            console.error('Error deleting question:', error)
            alert('Failed to delete question')
        }
    }

    const handleEditClick = (question: Question) => {
        setIsEditing(true)
        setEditingQuestionId(question.id)

        // Find subject to populate subject_id
        // Note: The question object has subject_id, so we use that.

        setNewQuestion({
            question_text: question.question_text,
            question_type: question.question_type,
            difficulty_level: question.difficulty_level,
            subject_id: question.subject_id || '',
            marks: question.marks || 1,
            options: question.options || { A: '', B: '', C: '', D: '' },
            correct_answer: question.correct_answer || 'A'
        })

        setIsAddModalOpen(true)
    }

    const handleSaveQuestion = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            let finalSubjectId = newQuestion.subject_id

            // Handle New Subject Creation
            if (isCreatingSubject && newSubjectName.trim()) {
                if (!defaultSubSessionId) {
                    throw new Error('No default exam session found. Cannot create subject.')
                }

                const { data: newSubject, error: subjectError } = await supabase
                    .from('exam_subjects')
                    .insert([{
                        name: newSubjectName.trim(),
                        sub_session_id: defaultSubSessionId,
                        weightage: 0 // Default weightage
                    }])
                    .select()
                    .single()

                if (subjectError) throw subjectError

                // Update local state and selection
                setAvailableSubjects([...availableSubjects, newSubject])
                finalSubjectId = newSubject.id
            }

            const payload: any = {
                // Schema requires 'type' (not null), mapping from local state
                type: newQuestion.question_type,
                question_text: newQuestion.question_text,
                question_type: newQuestion.question_type, // Keeping both for consistency if needed
                difficulty_level: newQuestion.difficulty_level,
                difficulty: newQuestion.difficulty_level, // Keeping both for consistency
                marks: newQuestion.marks,
                // Only include subject_id if it's selected
                ...(finalSubjectId && { subject_id: finalSubjectId }),
            }

            if (newQuestion.question_type === 'mcq') {
                payload.options = newQuestion.options
                payload.correct_answer = newQuestion.correct_answer
            }

            if (isEditing && editingQuestionId) {
                // UPDATE EXISTING QUESTION
                const { data, error } = await supabase
                    .from('question_bank')
                    .update(payload)
                    .eq('id', editingQuestionId)
                    .select()
                    .single()

                if (error) throw error

                // Update local state
                setQuestions(questions.map(q => q.id === editingQuestionId ? data : q))
                alert('Question updated successfully')

            } else {
                // CREATE NEW QUESTION
                const { data, error } = await supabase
                    .from('question_bank')
                    .insert([payload])
                    .select()
                    .single()

                if (error) throw error

                // Link to Exam Session (if selected)
                if (selectedSubSessionId) {
                    const { error: linkError } = await supabase
                        .from('exam_questions')
                        .insert([{
                            question_bank_id: data.id,
                            sub_session_id: selectedSubSessionId,
                            subject_id: finalSubjectId || null,
                            marks: newQuestion.marks || 1
                        }])

                    if (linkError) {
                        console.error('Error linking question to exam:', linkError)
                        // Non-fatal error, but good to log
                    }
                }

                setQuestions([data, ...questions])
                alert('Question added successfully')
            }

            // Close and Reset
            setIsAddModalOpen(false)
            setNewQuestion({
                question_text: '',
                question_type: 'mcq',
                difficulty_level: 'medium',
                subject_id: '',
                marks: 1,
                options: { A: '', B: '', C: '', D: '' },
                correct_answer: 'A'
            })
            setIsCreatingSubject(false)
            setNewSubjectName('')
            setIsEditing(false)
            setEditingQuestionId(null)

            router.refresh()

        } catch (error: any) {
            console.error('Error saving question:', error)
            alert('Failed to save question: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Filter questions based on selection
    const filteredQuestions = questions.filter(q => {
        // If specific test (sub-session) selected
        if (selectedSubSessionId) {
            const subject = subjects.find(s => s.id === q.subject_id)
            return subject?.sub_session_id === selectedSubSessionId
        }

        // If only exam session selected
        if (selectedExamSessionId) {
            const subject = subjects.find(s => s.id === q.subject_id)
            // find sub-session of this subject
            const subSession = subSessions.find(ss => ss.id === subject?.sub_session_id)
            return subSession?.exam_session_id === selectedExamSessionId
        }

        return true
    })

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
                        Question Bank
                    </h1>
                    <p className="text-[#6B6B6B]">
                        Manage MCQ, Written, and Cognitive assessment questions
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-[#C9A961] text-[#C9A961] rounded-lg hover:bg-[#F5EDD9] transition-colors">
                        <Upload className="h-5 w-5" />
                        Bulk Import
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(false)
                            setEditingQuestionId(null)
                            // Reset form to defaults
                            setNewQuestion({
                                question_text: '',
                                question_type: 'mcq',
                                difficulty_level: 'medium',
                                subject_id: '',
                                marks: 1,
                                options: { A: '', B: '', C: '', D: '' },
                                correct_answer: 'A'
                            })
                            setIsAddModalOpen(true)
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors shadow-md"
                    >
                        <Plus className="h-5 w-5" />
                        Add Question
                    </button>
                </div>
            </div>

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <div className="max-w-md mx-auto">
                        <FileQuestion className="h-16 w-16 text-[#C9A961] mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
                            No Questions Found
                        </h3>
                        <p className="text-[#6B6B6B] mb-6">
                            {(selectedExamSessionId || selectedSubSessionId)
                                ? "No questions match the selected filters."
                                : "Start building your question bank by adding MCQ, written, or cognitive assessment questions"}
                        </p>
                        <button
                            onClick={() => {
                                setIsEditing(false)
                                setEditingQuestionId(null)
                                setIsAddModalOpen(true)
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors shadow-md mx-auto"
                        >
                            <Plus className="h-5 w-5" />
                            Add Question
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#FAFAF8] border-b border-[#E5E7EB]">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Question</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Type</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Subject</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Marks</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Details</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Difficulty</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuestions.map((question) => (
                                    <tr key={question.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAF8] transition-colors">
                                        <td className="py-3 px-4 text-sm text-[#1A1A1A] max-w-sm truncate" title={question.question_text}>
                                            {question.question_text}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                {question.question_type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                            {subjects.find(s => s.id === question.subject_id)?.name || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                            {question.marks || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-[#6B6B6B] max-w-xs">
                                            {question.question_type === 'mcq' && question.options ? (
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(question.options).map(([key, value]: any) => (
                                                            <span key={key} className={`px-1.5 py-0.5 rounded border ${key === question.correct_answer ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200'}`}>
                                                                {key}: {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="italic text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${question.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                                                question.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {question.difficulty_level}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditClick(question)}
                                                    className="text-[#C9A961] hover:text-[#A68B4E] text-sm font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(question.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-scale-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-[#1A1A1A]">
                                {isEditing ? 'Edit Question' : 'Add New Question'}
                            </h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveQuestion} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={newQuestion.question_text}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    placeholder="Enter your question here..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Exam Session</label>
                                    <select
                                        value={selectedExamSessionId}
                                        onChange={(e) => {
                                            setSelectedExamSessionId(e.target.value)
                                            setSelectedSubSessionId('') // Reset test when session changes
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    >
                                        <option value="">Select Exam Session</option>
                                        {examSessions.map((session) => (
                                            <option key={session.id} value={session.id}>
                                                {session.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Test / Assessment</label>
                                    <select
                                        value={selectedSubSessionId}
                                        onChange={(e) => {
                                            const newId = e.target.value
                                            setSelectedSubSessionId(newId)
                                            // Auto-set question type based on session type
                                            const session = subSessions.find(s => s.id === newId)
                                            if (session) {
                                                const isWritten = session.session_type === 'written'
                                                setNewQuestion({
                                                    ...newQuestion,
                                                    question_type: session.session_type as any,
                                                    subject_id: '', // Reset subject when changing test
                                                    marks: isWritten ? 6 : 1
                                                })
                                            }
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        disabled={!selectedExamSessionId}
                                    >
                                        <option value="">Select Test</option>
                                        {subSessions
                                            .filter(s => s.exam_session_id === selectedExamSessionId)
                                            .map((session) => (
                                                <option key={session.id} value={session.id}>
                                                    {session.name} ({session.session_type})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                                    <select
                                        value={newQuestion.difficulty_level}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, difficulty_level: e.target.value as any })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreatingSubject(!isCreatingSubject)
                                                setNewQuestion({ ...newQuestion, subject_id: '' })
                                            }}
                                            className="ml-2 text-xs text-[#C9A961] hover:underline"
                                        >
                                            {isCreatingSubject ? 'Select Existing' : '+ Create New'}
                                        </button>
                                    </label>

                                    {isCreatingSubject ? (
                                        <input
                                            type="text"
                                            value={newSubjectName}
                                            onChange={(e) => setNewSubjectName(e.target.value)}
                                            placeholder="Enter new subject name"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        />
                                    ) : (
                                        <select
                                            value={newQuestion.subject_id}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, subject_id: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        >
                                            <option value="">Select Subject (Optional)</option>
                                            {availableSubjects
                                                .filter(s => !selectedSubSessionId || s.sub_session_id === selectedSubSessionId)
                                                .map((subject) => (
                                                    <option key={subject.id} value={subject.id}>
                                                        {subject.name}
                                                    </option>
                                                ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newQuestion.marks}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) || 1 })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {newQuestion.question_type === 'mcq' && (
                                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="text-sm font-semibold text-gray-900">Options</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['A', 'B', 'C', 'D'].map((opt) => (
                                            <div key={opt}>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Option {opt}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newQuestion.options[opt as keyof typeof newQuestion.options]}
                                                    onChange={(e) => setNewQuestion({
                                                        ...newQuestion,
                                                        options: { ...newQuestion.options, [opt]: e.target.value }
                                                    })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                                        <select
                                            value={newQuestion.correct_answer}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="A">Option A</option>
                                            <option value="B">Option B</option>
                                            <option value="C">Option C</option>
                                            <option value="D">Option D</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Question' : 'Add Question')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
