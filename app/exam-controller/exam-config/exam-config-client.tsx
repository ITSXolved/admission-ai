'use client'

import { useState } from 'react'
import { Plus, Settings, Calendar, Clock, Award, X, Loader2, Trash2, Brain } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ExamConfigClientProps {
    initialSessions: any[]
}

export default function ExamConfigClient({ initialSessions }: ExamConfigClientProps) {
    const [sessions, setSessions] = useState(initialSessions)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [viewingCognitiveSession, setViewingCognitiveSession] = useState<any | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const [newSession, setNewSession] = useState({
        name: '',
        start_date: '',
        end_date: '',
        description: '',
        duration_minutes: 60,
        total_marks: 100,
        min_qualification_mark: 40,
        subSessions: {
            mcq: 60,
            written: 20,
            cognitive: 20,
            fill_in_the_blank: 0,
            pick_and_place: 0
        }
    })

    const handleSaveSession = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)

        // Validate weightage
        const totalWeightage = Object.values(newSession.subSessions).reduce((a, b) => a + b, 0)
        if (totalWeightage !== 100) {
            alert('Total weightage must be exactly 100%')
            setIsCreating(false)
            return
        }

        // Validate dates
        if (!newSession.start_date || !newSession.end_date) {
            alert('Please select both start and end dates.')
            setIsCreating(false)
            return
        }

        // Check for online status
        if (!navigator.onLine) {
            alert('You appear to be offline. Please check your internet connection.')
            setIsCreating(false)
            return
        }

        try {
            let sessionId = editingSessionId

            if (editingSessionId) {
                // UPDATE Existing Session
                console.log('Updating session:', newSession)
                const { error: updateError } = await supabase
                    .from('exam_sessions')
                    .update({
                        name: newSession.name,
                        start_date: newSession.start_date,
                        end_date: newSession.end_date,
                        description: newSession.description,
                        duration_minutes: newSession.duration_minutes,
                        total_marks: newSession.total_marks,
                        min_qualification_mark: newSession.min_qualification_mark,
                    })
                    .eq('id', editingSessionId)

                if (updateError) {
                    console.error('Error updating session:', updateError)
                    throw updateError
                }

                // Update Sub-Sessions (Simpler to delete and recreate or just update weightages)
                // For simplicity, we'll update weightages one by one
                // First need to get existing sub-session IDs or we can rely on standard types
                // A better approach for this MVP is to just update the specific rows based on session_id + type

                const updates = [
                    { type: 'mcq', weight: newSession.subSessions.mcq },
                    { type: 'written', weight: newSession.subSessions.written },
                    { type: 'cognitive', weight: newSession.subSessions.cognitive },
                    { type: 'fill_in_the_blank', weight: newSession.subSessions.fill_in_the_blank },
                    { type: 'pick_and_place', weight: newSession.subSessions.pick_and_place }
                ]

                for (const up of updates) {
                    const { error: subUpdateError } = await supabase
                        .from('exam_sub_sessions')
                        .update({ weightage: up.weight })
                        .eq('exam_session_id', editingSessionId)
                        .eq('session_type', up.type) // Assuming session_type is unique per session

                    if (subUpdateError) {
                        console.error(`Error updating sub-session ${up.type}:`, subUpdateError)
                        throw subUpdateError
                    }
                }

            } else {
                // CREATE New Session
                console.log('Creating new session:', newSession)
                const { data: sessionData, error: sessionError } = await supabase
                    .from('exam_sessions')
                    .insert([
                        {
                            name: newSession.name,
                            start_date: newSession.start_date,
                            end_date: newSession.end_date,
                            description: newSession.description,
                            duration_minutes: newSession.duration_minutes,
                            total_marks: newSession.total_marks,
                            min_qualification_mark: newSession.min_qualification_mark,
                            is_active: false
                        }
                    ])
                    .select()
                    .single()

                if (sessionError) {
                    console.error('Error inserting exam_sessions:', sessionError)
                    throw sessionError
                }

                if (!sessionData) {
                    throw new Error('Session created but no data returned.')
                }

                sessionId = sessionData.id

                // Create Sub-Sessions
                const subSessionsData = [
                    {
                        exam_session_id: sessionId,
                        session_type: 'mcq',
                        name: 'MCQ Assessment',
                        weightage: newSession.subSessions.mcq,
                        sequence_order: 1
                    },
                    {
                        exam_session_id: sessionId,
                        session_type: 'written',
                        name: 'Written Assessment',
                        weightage: newSession.subSessions.written,
                        sequence_order: 2
                    },
                    {
                        exam_session_id: sessionId,
                        session_type: 'cognitive',
                        name: 'Cognitive Assessment',
                        weightage: newSession.subSessions.cognitive,
                        sequence_order: 3
                    },
                    {
                        exam_session_id: sessionId,
                        session_type: 'fill_in_the_blank',
                        name: 'Fill in the Blank',
                        weightage: newSession.subSessions.fill_in_the_blank,
                        sequence_order: 4
                    },
                    {
                        exam_session_id: sessionId,
                        session_type: 'pick_and_place',
                        name: 'Pick and Place',
                        weightage: newSession.subSessions.pick_and_place,
                        sequence_order: 5
                    }
                ]

                const { error: subError } = await supabase
                    .from('exam_sub_sessions')
                    .insert(subSessionsData)

                if (subError) {
                    console.error('Error inserting exam_sub_sessions:', subError)
                    // Try to cleanup the session if sub-sessions fail? 
                    // For now just throw
                    throw subError
                }
            }

            // Fetch complete session to update UI
            const { data: completeSession, error: fetchError } = await supabase
                .from('exam_sessions')
                .select(`
                    *,
                    exam_sub_sessions (
                        id,
                        session_type,
                        weightage
                    )
                `)
                .eq('id', sessionId)
                .single()

            if (fetchError) {
                console.error('Error fetching complete session:', fetchError)
                throw fetchError
            }

            // Update UI
            if (editingSessionId) {
                setSessions(sessions.map(s => s.id === editingSessionId ? completeSession : s))
                alert('Exam session updated successfully!')
            } else {
                setSessions([completeSession, ...sessions])
                alert('Exam session created successfully!')
            }

            resetForm()
            router.refresh()

        } catch (error: any) {
            console.error('Error saving session:', error)
            // Check for cause if available (e.g. from fetch)
            if (error.cause) {
                console.error('Error cause:', error.cause)
            }
            if (error.stack) {
                console.error('Error stack:', error.stack)
            }
            alert('Failed to save session: ' + (error.message || 'Unknown error. Check console for details.'))
        } finally {
            setIsCreating(false)
        }
    }

    const resetForm = () => {
        setIsCreateModalOpen(false)
        setEditingSessionId(null)
        setNewSession({
            name: '',
            start_date: '',
            end_date: '',
            description: '',
            duration_minutes: 60,
            total_marks: 100,
            min_qualification_mark: 40,
            subSessions: {
                mcq: 60,
                written: 20,
                cognitive: 20,
                fill_in_the_blank: 0,
                pick_and_place: 0
            }
        })
    }

    const handleEditClick = (session: any) => {
        setEditingSessionId(session.id)

        // Extract weightages
        const mcq = session.exam_sub_sessions.find((s: any) => s.session_type === 'mcq')?.weightage || 0
        const written = session.exam_sub_sessions.find((s: any) => s.session_type === 'written')?.weightage || 0
        const cognitive = session.exam_sub_sessions.find((s: any) => s.session_type === 'cognitive')?.weightage || 0
        const fill_in_the_blank = session.exam_sub_sessions.find((s: any) => s.session_type === 'fill_in_the_blank')?.weightage || 0
        const pick_and_place = session.exam_sub_sessions.find((s: any) => s.session_type === 'pick_and_place')?.weightage || 0

        setNewSession({
            name: session.name,
            start_date: session.start_date.split('T')[0],
            end_date: session.end_date.split('T')[0],
            description: session.description || '',
            duration_minutes: session.duration_minutes,
            total_marks: session.total_marks || 100,
            min_qualification_mark: session.min_qualification_mark || 0,
            subSessions: {
                mcq,
                written,
                cognitive,
                fill_in_the_blank,
                pick_and_place
            }
        })
        setIsCreateModalOpen(true)
    }

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm('Are you sure you want to delete this exam session? This action cannot be undone.')) {
            return
        }

        try {
            const { error } = await supabase
                .from('exam_sessions')
                .delete()
                .eq('id', sessionId)

            if (error) throw error

            setSessions(sessions.filter(s => s.id !== sessionId))
            router.refresh()
            alert('Exam session deleted successfully')
        } catch (error: any) {
            console.error('Error deleting session:', error)
            alert('Failed to delete session: ' + error.message)
        }
    }

    const handleToggleActive = async (sessionId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('exam_sessions')
                .update({ is_active: !currentStatus })
                .eq('id', sessionId)

            if (error) throw error

            setSessions(sessions.map(s =>
                s.id === sessionId ? { ...s, is_active: !currentStatus } : s
            ))
        } catch (error: any) {
            console.error('Error toggling status:', error)
            alert('Failed to update status: ' + error.message)
        }
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">Exam Configuration</h2>
                    <p className="text-[#6B6B6B]">Create and manage exam sessions</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors shadow-md"
                >
                    <Plus className="h-5 w-5" />
                    Create Exam Session
                </button>
            </div>

            {/* Exam Sessions List */}
            <div className="space-y-6">
                {sessions.length === 0 ? (
                    // ... empty state ...
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <Settings className="h-16 w-16 text-[#C9A961] mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
                                No Exam Sessions Yet
                            </h3>
                            <p className="text-[#6B6B6B] mb-6">
                                Create your first exam session to start configuring exams for students
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors shadow-md mx-auto"
                            >
                                <Plus className="h-5 w-5" />
                                Create Exam Session
                            </button>
                        </div>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div key={session.id} className="bg-white rounded-xl shadow-md p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">
                                        {session.name}
                                    </h3>
                                    <p className="text-sm text-[#6B6B6B]">
                                        {new Date(session.start_date).toLocaleDateString('en-GB')} - {new Date(session.end_date).toLocaleDateString('en-GB')}
                                    </p>
                                    {session.description && (
                                        <p className="text-sm text-gray-500 mt-1">{session.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleToggleActive(session.id, session.is_active)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:ring-offset-2 ${session.is_active ? 'bg-[#C9A961]' : 'bg-gray-200'
                                        }`}
                                    role="switch"
                                    aria-checked={session.is_active}
                                >
                                    <span className="sr-only">Toggle Active Status</span>
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${session.is_active ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="p-4 bg-[#F5EDD9] rounded-lg flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-[#C9A961]" />
                                    <div>
                                        <p className="text-sm text-[#6B6B6B]">Duration</p>
                                        <p className="text-lg font-bold text-[#1A1A1A]">{session.duration_minutes} min</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-[#F5EDD9] rounded-lg flex items-center gap-3">
                                    <Award className="h-5 w-5 text-[#C9A961]" />
                                    <div>
                                        <p className="text-sm text-[#6B6B6B]">Total Marks</p>
                                        <p className="text-lg font-bold text-[#1A1A1A]">{session.total_marks || 100}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-[#F5EDD9] rounded-lg">
                                    <p className="text-sm text-[#6B6B6B] mb-1">Qualification</p>
                                    <p className="text-lg font-bold text-[#1A1A1A]">{session.min_qualification_mark || 0}</p>
                                </div>
                            </div>

                            {/* Sub-Sessions Display */}
                            {session.exam_sub_sessions && session.exam_sub_sessions.length > 0 && (
                                <div className="border-t border-[#E5E7EB] pt-4">
                                    <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Sub-Sessions</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {session.exam_sub_sessions.map((subSession: any) => (
                                            <div key={subSession.id} className="p-3 border border-[#E5E7EB] rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-[#1A1A1A] capitalize">
                                                        {subSession.session_type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#C9A961]">
                                                        {subSession.weightage}%
                                                    </span>
                                                </div>
                                                {subSession.session_type === 'cognitive' && (
                                                    <button
                                                        onClick={() => setViewingCognitiveSession(subSession)}
                                                        className="mt-2 w-full text-xs flex items-center justify-center gap-1.5 py-1.5 bg-[#F5EDD9] text-[#A68B4E] rounded hover:bg-[#EBE0C5] transition-colors"
                                                    >
                                                        <Brain className="h-3.5 w-3.5" />
                                                        View Games
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-4 pt-4 border-t border-[#E5E7EB]">
                                <button
                                    onClick={() => handleEditClick(session)}
                                    className="px-4 py-2 text-sm text-[#C9A961] border border-[#C9A961] rounded-lg hover:bg-[#F5EDD9] transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => alert('Configure Subjects feature coming soon!')}
                                    className="px-4 py-2 text-sm text-[#C9A961] border border-[#C9A961] rounded-lg hover:bg-[#F5EDD9] transition-colors"
                                >
                                    Configure Subjects
                                </button>
                                <button
                                    onClick={() => alert('Set Criteria feature coming soon!')}
                                    className="px-4 py-2 text-sm text-[#C9A961] border border-[#C9A961] rounded-lg hover:bg-[#F5EDD9] transition-colors"
                                >
                                    Set Criteria
                                </button>
                                <button
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="ml-auto px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                                <button
                                    onClick={() => router.push(`/exam-controller/questions?exam_session_id=${session.id}`)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors shadow-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Questions
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Session Modal */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-scale-up">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-[#1A1A1A]">
                                    {editingSessionId ? 'Edit Exam Session' : 'Create New Exam Session'}
                                </h3>
                                <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-full">
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveSession} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Annual Exam 2026"
                                        value={newSession.name}
                                        onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={newSession.start_date}
                                            onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={newSession.end_date}
                                            onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={newSession.duration_minutes}
                                            onChange={(e) => setNewSession({ ...newSession, duration_minutes: parseInt(e.target.value) })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={newSession.total_marks}
                                            onChange={(e) => setNewSession({ ...newSession, total_marks: parseInt(e.target.value) })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Qualification Marks</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max={newSession.total_marks}
                                        value={newSession.min_qualification_mark}
                                        onChange={(e) => setNewSession({ ...newSession, min_qualification_mark: parseInt(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    />
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Section Weightage (%)</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">MCQ</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                max="100"
                                                value={newSession.subSessions.mcq}
                                                onChange={(e) => setNewSession({
                                                    ...newSession,
                                                    subSessions: { ...newSession.subSessions, mcq: parseInt(e.target.value || '0') }
                                                })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Written</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                max="100"
                                                value={newSession.subSessions.written}
                                                onChange={(e) => setNewSession({
                                                    ...newSession,
                                                    subSessions: { ...newSession.subSessions, written: parseInt(e.target.value || '0') }
                                                })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Cognitive</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                max="100"
                                                value={newSession.subSessions.cognitive}
                                                onChange={(e) => setNewSession({
                                                    ...newSession,
                                                    subSessions: { ...newSession.subSessions, cognitive: parseInt(e.target.value || '0') }
                                                })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Fill Blanks</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                max="100"
                                                value={newSession.subSessions.fill_in_the_blank}
                                                onChange={(e) => setNewSession({
                                                    ...newSession,
                                                    subSessions: { ...newSession.subSessions, fill_in_the_blank: parseInt(e.target.value || '0') }
                                                })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Pick & Place</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                max="100"
                                                value={newSession.subSessions.pick_and_place}
                                                onChange={(e) => setNewSession({
                                                    ...newSession,
                                                    subSessions: { ...newSession.subSessions, pick_and_place: parseInt(e.target.value || '0') }
                                                })}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    {Object.values(newSession.subSessions).reduce((a, b) => a + b, 0) !== 100 && (
                                        <p className="text-red-500 text-xs mt-1">Total weightage must be 100%</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                    <textarea
                                        value={newSession.description}
                                        onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                                        rows={3}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                                    />
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex items-center gap-2 px-6 py-2 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors disabled:opacity-50"
                                    >
                                        {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {editingSessionId ? 'Update Session' : 'Create Session'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* View Cognitive Games Modal */}
            {viewingCognitiveSession && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-[#1A1A1A]">
                                    Cognitive Assessment Games
                                </h3>
                                <p className="text-sm text-[#6B6B6B]">
                                    Active games configured for this session
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingCognitiveSession(null)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        {(!viewingCognitiveSession.cognitive_test_configs || viewingCognitiveSession.cognitive_test_configs.length === 0) ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No games configured for this session</p>
                                <p className="text-sm text-gray-400">Default games are usually applied automatically.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {viewingCognitiveSession.cognitive_test_configs.map((game: any) => (
                                    <div key={game.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#C9A961] transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-[#1A1A1A]">{game.name}</h4>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${game.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                                                game.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {game.difficulty_level}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3 min-h-[40px]">{game.instructions_english}</p>

                                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {game.time_limit_seconds}s Limit
                                            </div>
                                            <div>
                                                Typ: <span className="font-medium text-gray-700 capitalize">{game.test_type.replace(/_/g, ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setViewingCognitiveSession(null)}
                                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
