'use client'

import { createClient } from '@/lib/supabase/client'
import { FileQuestion, Plus, Upload, X, Image as ImageIcon } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Question {
    id: string
    question_text: string
    question_type: 'mcq' | 'written' | 'cognitive' | 'fill_in_the_blank' | 'pick_and_place'
    difficulty_level: 'easy' | 'medium' | 'hard'
    options?: any
    correct_answer?: string
    subject_id?: string
    marks?: number
    question_image_url?: string
    created_at: string
    answer_key?: string
    exam_questions?: { sub_session_id: string }[]
    exam_session_id?: string
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
            A: { text: '', image: '' },
            B: { text: '', image: '' },
            C: { text: '', image: '' },
            D: { text: '', image: '' }
        },
        correct_answer: 'A',
        answer_key: '',
        question_image_url: ''
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    // Update router when filters change
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (selectedExamSessionId) {
            params.set('exam_session_id', selectedExamSessionId)
        } else {
            params.delete('exam_session_id')
        }

        // This will trigger a server re-render if page.tsx uses searchParams
        router.push(`?${params.toString()}`)
    }, [selectedExamSessionId, router, searchParams])

    // Sync questions when initialQuestions (props) update due to server-side filter change
    useEffect(() => {
        setQuestions(initialQuestions)
    }, [initialQuestions])

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

    const uploadImage = async (file: File, folder: string) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${folder}/${Date.now()}.${fileExt}`
        const { error: uploadError, data } = await supabase.storage
            .from('exam-uploads')
            .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('exam-uploads')
            .getPublicUrl(fileName)

        return publicUrl
    }

    const handleEditClick = (question: Question) => {
        setIsEditing(true)
        setEditingQuestionId(question.id)

        // Find subject to populate subject_id
        // Note: The question object has subject_id, so we use that.

        // Normalize options to object structure if they are legacy strings
        const normalizedOptions: any = { A: { text: '', image: '' }, B: { text: '', image: '' }, C: { text: '', image: '' }, D: { text: '', image: '' } }
        if (question.options) {
            Object.keys(question.options).forEach(key => {
                const val = question.options[key]
                if (typeof val === 'string') {
                    normalizedOptions[key] = { text: val, image: '' }
                } else {
                    normalizedOptions[key] = { text: val.text || '', image: val.image || '' }
                }
            })
        }

        setNewQuestion({
            question_text: question.question_text,
            question_type: question.question_type,
            difficulty_level: question.difficulty_level,
            subject_id: question.subject_id || '',
            marks: question.marks || 1,
            options: normalizedOptions,
            correct_answer: question.correct_answer || 'A',
            answer_key: question.answer_key || '',
            question_image_url: question.question_image_url || ''
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

            // Determine Exam Session ID
            let finalExamSessionId = selectedExamSessionId
            if (!finalExamSessionId && selectedSubSessionId && !selectedSubSessionId.startsWith('type:')) {
                // Infer from selected sub-session
                const subSession = subSessions.find(s => s.id === selectedSubSessionId)
                if (subSession?.exam_session_id) {
                    finalExamSessionId = subSession.exam_session_id
                }
            }

            const payload: any = {
                question_text: newQuestion.question_text,
                question_type: newQuestion.question_type,
                difficulty_level: newQuestion.difficulty_level,
                marks: newQuestion.marks,
                // Only include subject_id if it's selected
                ...(finalSubjectId && { subject_id: finalSubjectId }),
                // Scope to exam session
                ...(finalExamSessionId && { exam_session_id: finalExamSessionId }),
            }

            if (newQuestion.question_type === 'mcq') {
                payload.options = newQuestion.options
                payload.correct_answer = newQuestion.correct_answer
            } else if (['written', 'fill_in_the_blank', 'pick_and_place'].includes(newQuestion.question_type)) {
                payload.answer_key = newQuestion.answer_key
            }

            if (newQuestion.question_image_url) {
                payload.question_image_url = newQuestion.question_image_url
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

                // Link to Exam Session
                let linkSubSessionId = selectedSubSessionId;

                // If generic or not selected, try to find the correct sub-session for this exam and type
                if ((!linkSubSessionId || linkSubSessionId.startsWith('type:')) && finalExamSessionId) {
                    const matchingSubSession = subSessions.find(s =>
                        s.exam_session_id === finalExamSessionId &&
                        s.session_type === newQuestion.question_type
                    );
                    if (matchingSubSession) {
                        linkSubSessionId = matchingSubSession.id;
                    }
                }

                if (linkSubSessionId && !linkSubSessionId.startsWith('type:')) {
                    const { error: linkError } = await supabase
                        .from('exam_questions')
                        .insert([{
                            question_bank_id: data.id,
                            sub_session_id: linkSubSessionId,
                            subject_id: finalSubjectId || null,
                            marks: newQuestion.marks || 1
                        }])

                    if (linkError) {
                        console.error('Error linking question to exam:', linkError)
                    }
                }

                setQuestions([data, ...questions])
                alert('Question added successfully. View switched to show this type.')

                // If generic question (not linked), switch view to show it
                if (!selectedSubSessionId || selectedSubSessionId.startsWith('type:')) {
                    setSelectedSubSessionId(`type:${newQuestion.question_type}`)
                }
            }

            // Close and Reset
            setIsAddModalOpen(false)
            setNewQuestion({
                question_text: '',
                question_type: 'mcq',
                difficulty_level: 'medium',
                subject_id: '',
                marks: 1,
                options: { A: { text: '', image: '' }, B: { text: '', image: '' }, C: { text: '', image: '' }, D: { text: '', image: '' } },
                correct_answer: 'A',
                answer_key: '',
                question_image_url: ''
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

    const formatSessionType = (type: string) => {
        switch (type) {
            case 'mcq': return 'MCQ'
            case 'written': return 'Written'
            case 'fill_in_the_blank': return 'Fill in the Blank'
            case 'pick_and_place': return 'Pick and Place'
            case 'cognitive': return 'Cognitive'
            default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }
    }

    // Filter questions based on selection
    const filteredQuestions = questions.filter(q => {
        // If specific test (sub-session) selected
        if (selectedSubSessionId) {
            // Check if it's a generic type filter
            if (selectedSubSessionId.startsWith('type:')) {
                const type = selectedSubSessionId.split(':')[1]
                return q.question_type === type
            }

            // Check direct linkage via exam_questions
            const isLinkedDirectly = q.exam_questions?.some(eq => eq.sub_session_id === selectedSubSessionId)

            // Check linkage via subject
            const subject = subjects.find(s => s.id === q.subject_id)
            const isLinkedViaSubject = subject?.sub_session_id === selectedSubSessionId

            return isLinkedDirectly || isLinkedViaSubject
        }

        // If only exam session selected
        if (selectedExamSessionId) {
            // Check strict ownership
            if (q.exam_session_id === selectedExamSessionId) return true

            // Check direct linkage via sub-session -> exam_session
            const isLinkedDirectly = q.exam_questions?.some(eq => {
                const sub = subSessions.find(ss => ss.id === eq.sub_session_id)
                return sub?.exam_session_id === selectedExamSessionId
            })

            // Check linkage via subject
            const subject = subjects.find(s => s.id === q.subject_id)
            // find sub-session of this subject
            const subSession = subSessions.find(ss => ss.id === subject?.sub_session_id)
            const isLinkedViaSubject = subSession?.exam_session_id === selectedExamSessionId

            return isLinkedDirectly || isLinkedViaSubject
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
                                options: { A: { text: '', image: '' }, B: { text: '', image: '' }, C: { text: '', image: '' }, D: { text: '', image: '' } },
                                correct_answer: 'A',
                                answer_key: '',
                                question_image_url: ''
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
                                        <td className="py-3 px-4 text-sm text-[#1A1A1A] max-w-sm" title={question.question_text}>
                                            <div className="flex flex-col gap-1">
                                                {question.question_image_url && (
                                                    <img src={question.question_image_url} alt="Q" className="h-10 w-10 object-cover rounded" />
                                                )}
                                                <span className="truncate">{question.question_text}</span>
                                            </div>
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
                                                        {Object.entries(question.options).map(([key, value]: any) => {
                                                            const text = typeof value === 'string' ? value : value.text
                                                            return (
                                                                <span key={key} className={`px-1.5 py-0.5 rounded border ${key === question.correct_answer ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-gray-50 border-gray-200'}`}>
                                                                    {key}: {text}
                                                                </span>
                                                            )
                                                        })}
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
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
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
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Question Image (Optional)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    try {
                                                        const url = await uploadImage(file, 'questions')
                                                        setNewQuestion({ ...newQuestion, question_image_url: url })
                                                    } catch (error) {
                                                        console.error('Upload failed:', error)
                                                        alert('Failed to upload question image')
                                                    }
                                                }}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#F5EDD9] file:text-[#C9A961] hover:file:bg-[#EBE3CF]"
                                            />
                                        </div>
                                        {newQuestion.question_image_url && (
                                            <div className="relative w-16 h-16 rounded border overflow-hidden group">
                                                <img
                                                    src={newQuestion.question_image_url}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewQuestion({ ...newQuestion, question_image_url: '' })}
                                                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                            </div>
                            <div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Test / Assessment / Type</label>
                                    <select
                                        value={selectedSubSessionId}
                                        onChange={(e) => {
                                            const newId = e.target.value
                                            setSelectedSubSessionId(newId)

                                            // Check if it's a generic type selection
                                            if (newId.startsWith('type:')) {
                                                const type = newId.split(':')[1] as any
                                                setNewQuestion({
                                                    ...newQuestion,
                                                    question_type: type,
                                                    subject_id: '',
                                                    marks: (type === 'written' || type === 'fill_in_the_blank' || type === 'pick_and_place') ? 6 : 1
                                                })
                                            } else {
                                                // It's a specific sub-session
                                                const session = subSessions.find(s => s.id === newId)
                                                if (session) {
                                                    const isWritten = session.session_type === 'written' || session.session_type === 'fill_in_the_blank' || session.session_type === 'pick_and_place'
                                                    setNewQuestion({
                                                        ...newQuestion,
                                                        question_type: session.session_type as any,
                                                        subject_id: '',
                                                        marks: isWritten ? 6 : 1
                                                    })
                                                }
                                            }
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    >
                                        <option value="">Select Type or Test</option>

                                        {/* Always Show Generic Types */}
                                        {!selectedExamSessionId && (
                                            <optgroup label="Generic Question Types">
                                                <option value="type:mcq">Multiple Choice (MCQ)</option>
                                                <option value="type:written">Written / Subjective</option>
                                                <option value="type:fill_in_the_blank">Fill in the Blank</option>
                                                <option value="type:pick_and_place">Pick and Place</option>
                                                <option value="type:cognitive">Cognitive (Game)</option>
                                            </optgroup>
                                        )}

                                        {/* Show Assessments based on selection */}
                                        <optgroup label={selectedExamSessionId ? "Assessments for Selected Session" : "All Assessments"}>
                                            {subSessions
                                                .filter(s => !selectedExamSessionId || s.exam_session_id === selectedExamSessionId)
                                                .map((session) => (
                                                    <option key={session.id} value={session.id}>
                                                        {session.name} ({formatSessionType(session.session_type)})
                                                    </option>
                                                ))}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            {/* Question Type inferred from selection above */}
                            <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-center justify-between">
                                <span>Type: <span className="font-bold capitalize">{newQuestion.question_type.replace(/_/g, ' ')}</span></span>
                                {selectedSubSessionId.startsWith('type:') && (
                                    <span className="text-xs bg-blue-100 px-2 py-1 rounded">Generic (Not linked to specific test)</span>
                                )}
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
                                                .filter(s =>
                                                    !selectedSubSessionId ||
                                                    selectedSubSessionId.startsWith('type:') ||
                                                    s.sub_session_id === selectedSubSessionId
                                                )
                                                .map((subject) => (
                                                    <option key={subject.id} value={subject.id}>
                                                        {subject.name}
                                                    </option>
                                                ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {newQuestion.question_type === 'mcq' && (
                                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="text-sm font-semibold text-gray-900">Options</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {['A', 'B', 'C', 'D'].map((opt) => (
                                            <div key={opt}>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Option {opt}</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newQuestion.options[opt as keyof typeof newQuestion.options].text}
                                                        onChange={(e) => setNewQuestion({
                                                            ...newQuestion,
                                                            options: {
                                                                ...newQuestion.options,
                                                                [opt]: { ...newQuestion.options[opt as keyof typeof newQuestion.options], text: e.target.value }
                                                            }
                                                        })}
                                                        placeholder={`Option ${opt} text`}
                                                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                                                    />
                                                    <div className="relative w-10">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0]
                                                                if (!file) return
                                                                try {
                                                                    const url = await uploadImage(file, 'options')
                                                                    setNewQuestion({
                                                                        ...newQuestion,
                                                                        options: {
                                                                            ...newQuestion.options,
                                                                            [opt]: { ...newQuestion.options[opt as keyof typeof newQuestion.options], image: url }
                                                                        }
                                                                    })
                                                                } catch (error) {
                                                                    console.error('Upload failed:', error)
                                                                    alert('Failed to upload image')
                                                                }
                                                            }}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            className={`w-full h-full rounded border flex items-center justify-center ${newQuestion.options[opt as keyof typeof newQuestion.options].image ? 'border-[#C9A961] bg-[#F5EDD9] text-[#C9A961]' : 'border-gray-300 bg-white text-gray-400'
                                                                }`}
                                                            title="Upload Option Image"
                                                        >
                                                            {newQuestion.options[opt as keyof typeof newQuestion.options].image ? (
                                                                <img
                                                                    src={newQuestion.options[opt as keyof typeof newQuestion.options].image}
                                                                    alt="Opt"
                                                                    className="w-full h-full object-cover rounded"
                                                                />
                                                            ) : (
                                                                <ImageIcon className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
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

                            {['written', 'fill_in_the_blank', 'pick_and_place'].includes(newQuestion.question_type) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer Key (Optional - for AI Evaluation)</label>
                                    <textarea
                                        rows={4}
                                        value={newQuestion.answer_key}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, answer_key: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        placeholder="Enter the correct answer or key points..."
                                    />
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
