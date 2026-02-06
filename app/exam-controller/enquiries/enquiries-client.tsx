'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Mail, MessageSquare, Plus, X, Trash2, Share2, Loader2, Calendar, CheckSquare, Square } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createClient } from '@/lib/supabase/client'

interface EnquiriesClientProps {
    initialEnquiries: any[]
    initialExamAssignments?: Record<string, string[]>
}

export function EnquiriesClient({ initialEnquiries, initialExamAssignments = {} }: EnquiriesClientProps) {
    const [enquiries, setEnquiries] = useState(initialEnquiries)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [gradeFilter, setGradeFilter] = useState('all')
    const [dateStart, setDateStart] = useState('')
    const [dateEnd, setDateEnd] = useState('')

    // Supabase client
    const supabase = createClient()


    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Modals
    const [viewingEnquiry, setViewingEnquiry] = useState<any>(null)
    const [shareModalEnquiry, setShareModalEnquiry] = useState<any>(null)

    // Assign Test Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [examSessions, setExamSessions] = useState<any[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState('')
    const [isAssigning, setIsAssigning] = useState(false)

    // Remove Access Modal
    const [removeAccessModal, setRemoveAccessModal] = useState<{ enquiryId: string, studentName: string } | null>(null)
    const [assignedExams, setAssignedExams] = useState<any[]>([])
    const [isLoadingExams, setIsLoadingExams] = useState(false)

    // Exam assignments for table display (enquiry_id -> exam names[])
    const [examAssignments, setExamAssignments] = useState<Record<string, string[]>>(initialExamAssignments)

    // Previous state code...
    const [shareMessage, setShareMessage] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [newCredentials, setNewCredentials] = useState<Record<string, string>>({})

    // Fetch Exam Sessions when opening modal
    useEffect(() => {
        if (isAssignModalOpen) {
            const fetchSessions = async () => {
                const supabase = createClient()
                const { data } = await supabase
                    .from('exam_sessions')
                    .select('id, name, start_date')
                    // Show sessions that haven't ended yet (end_date >= now)
                    // We remove .eq('is_active', true) to rely on date validity as requested
                    .gte('end_date', new Date().toISOString())
                    .order('start_date', { ascending: true })

                if (data) setExamSessions(data)
            }
            fetchSessions()
        }
    }, [isAssignModalOpen])

    // Fetch Assigned Exams when opening remove access modal
    useEffect(() => {
        if (removeAccessModal) {
            const fetchAssignedExams = async () => {
                setIsLoadingExams(true)
                const supabase = createClient()
                const { data } = await supabase
                    .from('student_exam_attempts')
                    .select('id, status, exam_session:exam_sessions(id, name)')
                    .eq('student_id', removeAccessModal.enquiryId)
                    .order('started_at', { ascending: false })

                if (data) setAssignedExams(data)
                setIsLoadingExams(false)
            }
            fetchAssignedExams()
        } else {
            setAssignedExams([])
        }
    }, [removeAccessModal])

    // Filter enquiries
    const filteredEnquiries = enquiries.filter(enquiry => {
        const matchesSearch =
            enquiry.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enquiry.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enquiry.email?.toLowerCase().includes(searchTerm.toLowerCase())

        const currentStatus = enquiry.overall_status || 'pending'
        const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter

        const filterGrade = gradeFilter
        const gradeString = String(enquiry.applying_grade || '').toLowerCase()
        const matchesGrade = gradeFilter === 'all' ||
            gradeString === filterGrade ||
            gradeString === `grade ${filterGrade}` ||
            gradeString.includes(`grade ${filterGrade}`)

        // Date Range Filter
        let matchesDate = true
        if (dateStart && dateEnd) {
            const enquiryDate = new Date(enquiry.created_at)
            const start = new Date(dateStart)
            const end = new Date(dateEnd)
            end.setHours(23, 59, 59) // Include the end day fully
            matchesDate = enquiryDate >= start && enquiryDate <= end
        }

        return matchesSearch && matchesStatus && matchesGrade && matchesDate
    })

    // Bulk selection handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredEnquiries.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredEnquiries.map(e => e.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleAssignTest = async () => {
        if (!selectedSessionId) {
            alert('Please select an exam session')
            return
        }

        setIsAssigning(true)
        try {
            const response = await fetch('/api/exams/assign-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enquiryIds: Array.from(selectedIds),
                    examSessionId: selectedSessionId
                })
            })

            const data = await response.json()
            if (response.ok) {
                alert(`Successfully assigned test to ${data.results.filter((r: any) => r.status === 'success').length} candidates.`)
                setIsAssignModalOpen(false)
                setSelectedIds(new Set())
                setSelectedSessionId('')

                // Refresh exam assignments to update the table
                const supabase = createClient()
                const { data: assignmentsData } = await supabase
                    .from('student_exam_attempts')
                    .select('student_id, exam_session:exam_sessions(name)')

                if (assignmentsData) {
                    const assignments: Record<string, string[]> = {}
                    assignmentsData.forEach((attempt: any) => {
                        const studentId = attempt.student_id
                        const examName = attempt.exam_session?.name || 'Unknown'
                        if (!assignments[studentId]) {
                            assignments[studentId] = []
                        }
                        if (!assignments[studentId].includes(examName)) {
                            assignments[studentId].push(examName)
                        }
                    })
                    setExamAssignments(assignments)
                }
            } else {
                alert('Failed to assign tests: ' + data.error)
            }
        } catch (error) {
            console.error('Error assigning test:', error)
            alert('An error occurred while assigning tests.')
        } finally {
            setIsAssigning(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this enquiry?')) {
            try {
                const response = await fetch(`/api/enquiries/${id}`, {
                    method: 'DELETE',
                })

                if (response.ok) {
                    setEnquiries(enquiries.filter(e => e.id !== id))
                    setViewingEnquiry(null)
                    alert('Enquiry deleted successfully')
                } else {
                    const data = await response.json()
                    alert(data.error || 'Failed to delete enquiry')
                }
            } catch (error) {
                console.error('Error deleting enquiry:', error)
                alert('Error deleting enquiry')
            }
        }
    }

    const handleRemoveAccess = async (attemptId: string, examName: string) => {
        if (confirm(`Are you sure you want to remove access to "${examName}"?`)) {
            try {
                const supabase = createClient()

                // Get the student_id before deleting
                const { data: attemptData } = await supabase
                    .from('student_exam_attempts')
                    .select('student_id')
                    .eq('id', attemptId)
                    .single()

                const { error } = await supabase
                    .from('student_exam_attempts')
                    .delete()
                    .eq('id', attemptId)

                if (error) throw error

                alert('Exam access removed successfully')
                // Refresh the assigned exams list in modal
                setAssignedExams(prev => prev.filter(exam => exam.id !== attemptId))

                // Update the table display
                if (attemptData?.student_id) {
                    setExamAssignments(prev => {
                        const updated = { ...prev }
                        if (updated[attemptData.student_id]) {
                            updated[attemptData.student_id] = updated[attemptData.student_id].filter(name => name !== examName)
                            if (updated[attemptData.student_id].length === 0) {
                                delete updated[attemptData.student_id]
                            }
                        }
                        return updated
                    })
                }
            } catch (error: any) {
                console.error('Error removing exam access:', error)
                alert(`Failed to remove exam access: ${error.message}`)
            }
        }
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.text('Admission Enquiries Report', 14, 20)
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 28)

        // Use filtered enquiries for export
        const tableData = filteredEnquiries.map(enquiry => [
            `${enquiry.first_name} ${enquiry.last_name}`,
            enquiry.email,
            enquiry.primary_mobile,
            `Grade ${enquiry.applying_grade}`,
            (enquiry.overall_status || 'pending').replace(/_/g, ' '),
            new Date(enquiry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        ])

        autoTable(doc, {
            startY: 35,
            head: [['Name', 'Email', 'Phone', 'Grade', 'Status', 'Date']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [201, 169, 97], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 }
        })
        doc.save(`admission-enquiries-${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-blue-100 text-blue-800',
            applied: 'bg-indigo-100 text-indigo-800',
            qualified: 'bg-green-100 text-green-800',
            not_qualified: 'bg-red-100 text-red-800',
            called_for_interview: 'bg-yellow-100 text-yellow-800',
            admitted: 'bg-purple-100 text-purple-800',
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const handleShareClick = async (enquiry: any) => {
        // ... existing implementation
        // Copied from previous view for brevity, assuming internal structure is same
        // Since replace_file_content replaces the block, I need to ensure I don't lose the share logic details.
        // However, to keep this clean, I will re-implement the necessary parts or rely on the user context if I was just editing.
        // BUT, since I am replacing almost the whole file, I MUST include the full share logic.
        // Let's reconstruct it quickly based on previous context.

        let username = enquiry.user_credentials?.[0]?.username || enquiry.user_credentials?.username
        let password = newCredentials[enquiry.id]

        // Always call the API to generate or regenerate credentials for sharing
        setIsGenerating(true)
        try {
            // Always request regenerate=true when sharing to ensure we get a password
            // For new users: creates credentials
            // For existing users: regenerates password so we can share it

            console.log('=== Client-side Debug ===')
            console.log('enquiry:', enquiry)
            console.log('username:', username)
            console.log('Always sending regenerate: true for sharing')

            const requestBody = {
                enquiryIds: [enquiry.id],
                regenerate: true // Always regenerate to get a shareable password
            }
            console.log('Request body:', JSON.stringify(requestBody, null, 2))

            const response = await fetch('/api/generate-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            })
            const data = await response.json()
            const result = data.results?.[0]

            if (response.ok && result) {
                if (result.status === 'success') {
                    // Credentials generated or password regenerated
                    username = result.username
                    password = result.password
                    setNewCredentials(prev => ({ ...prev, [enquiry.id]: password }))
                    // Optimistically update
                    const updatedEnquiries = [...enquiries]
                    const index = updatedEnquiries.findIndex(e => e.id === enquiry.id)
                    if (index !== -1) {
                        updatedEnquiries[index] = {
                            ...updatedEnquiries[index],
                            user_credentials: { username: result.username }
                        }
                    }
                    setEnquiries(updatedEnquiries)
                } else if (result.status === 'skipped') {
                    // This shouldn't happen anymore with regenerate flag, but handle it
                    username = result.username
                    alert('Using existing credentials. Password was not regenerated.')
                    setIsGenerating(false)
                    return
                } else {
                    // Failed status
                    console.error('Failed to generate credentials:', data)
                    alert(`Failed to generate credentials: ${result.error || data.error || 'Unknown error'}`)
                    setIsGenerating(false)
                    return
                }
            } else {
                console.error('Failed to generate credentials:', data)
                alert(`Failed to generate credentials: ${data.error || 'Unknown error'}`)
                setIsGenerating(false)
                return
            }
        } catch (error) {
            console.error('Error generating:', error)
            setIsGenerating(false)
            return
        } finally {
            setIsGenerating(false)
        }

        let message = ''
        if (password) {
            message = `*Welcome to AILT Global Academy!*\n\nAssalamu Alaikum ${enquiry.first_name},\n\nWe are pleased to inform you that your admission application has been processed.\n\n*Your Login Credentials:*\nUsername: ${username}\nPassword: ${password}\n\n*Login Here:* https://admission-ai-five.vercel.app/login`
        } else {
            message = `*Welcome to AILT Global Academy!*\n\nAssalamu Alaikum ${enquiry.first_name},\n\nWe are pleased to inform you that your admission application has been processed.\n\n*Your Login Credentials:*\nUsername: ${username}\nPassword: (Check your email or reset below)\n\n*Login:* https://admission-ai-five.vercel.app/login\n*Reset Password:* https://admission-ai-five.vercel.app/forgot-password`
        }
        setShareMessage(message)
        setShareModalEnquiry(enquiry)
    }

    const performShareWhatsApp = () => {
        if (!shareModalEnquiry?.primary_mobile) return alert('No mobile number')
        window.open(`https://wa.me/${shareModalEnquiry.primary_mobile}?text=${encodeURIComponent(shareMessage)}`, '_blank')
        setShareModalEnquiry(null)
    }

    const performShareEmail = async () => {
        if (!shareModalEnquiry?.email) return alert('No email')
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enquiryIds: [shareModalEnquiry.id],
                    subject: 'Welcome to AILT Global Academy - Credentials',
                    message: shareMessage,
                    type: 'bulk'
                })
            })
            alert('Email sent')
            setShareModalEnquiry(null)
        } catch (e) {
            console.error(e)
            alert('Failed to send email')
        }
    }

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center mb-4">
                    {/* Filters Group */}
                    <div className="flex flex-wrap gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6B6B6B]" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="applied">Applied</option>
                            <option value="qualified">Qualified</option>
                            <option value="not_qualified">Not Qualified</option>
                        </select>
                        <select
                            value={gradeFilter}
                            onChange={(e) => setGradeFilter(e.target.value)}
                            className="px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
                        >
                            <option value="all">All Grades</option>
                            {[...Array(13)].map((_, i) => (
                                <option key={i} value={String(i)}>Grade {i}</option>
                            ))}
                        </select>
                        {/* Date Range */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateStart}
                                onChange={(e) => setDateStart(e.target.value)}
                                className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={dateEnd}
                                onChange={(e) => setDateEnd(e.target.value)}
                                className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <div className="text-sm text-gray-500">
                        {selectedIds.size > 0 ? (
                            <span className="text-[#C9A961] font-semibold">{selectedIds.size} student(s) selected</span>
                        ) : 'Select students to take actions'}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckSquare className="h-5 w-5" />
                            Assign Test
                        </button>

                        <button
                            onClick={handleExportPDF}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors"
                        >
                            <Download className="h-5 w-5" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#FAFAF8] border-b border-[#E5E7EB]">
                            <tr>
                                <th className="py-3 px-4 w-12">
                                    <button onClick={toggleSelectAll} className="flex items-center justify-center text-gray-400 hover:text-[#C9A961]">
                                        {selectedIds.size > 0 && selectedIds.size === filteredEnquiries.length ? <CheckSquare className="h-5 w-5 text-[#C9A961]" /> : <Square className="h-5 w-5" />}
                                    </button>
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Name</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Email</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Phone</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Grade</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Assigned Exams</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEnquiries.map((enquiry) => (
                                <tr key={enquiry.id} className={`border-b border-[#F5F5F5] transition-colors ${selectedIds.has(enquiry.id) ? 'bg-[#FDF9F0]' : 'hover:bg-[#FAFAF8]'}`}>
                                    <td className="py-3 px-4">
                                        <button onClick={() => toggleSelect(enquiry.id)} className="flex items-center justify-center text-gray-400">
                                            {selectedIds.has(enquiry.id) ? <CheckSquare className="h-5 w-5 text-[#C9A961]" /> : <Square className="h-5 w-5" />}
                                        </button>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#1A1A1A] font-medium">
                                        {enquiry.first_name} {enquiry.last_name}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                        {enquiry.email}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                        {enquiry.primary_mobile}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                        {enquiry.applying_grade}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(enquiry.overall_status || 'pending')}`}>
                                            {(enquiry.overall_status || 'pending').replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                        {examAssignments[enquiry.id] && examAssignments[enquiry.id].length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {examAssignments[enquiry.id].map((examName, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                        {examName}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">No exams assigned</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                        {new Date(enquiry.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </td>
                                    <td className="py-3 px-4 flex gap-2">
                                        <button
                                            onClick={() => handleShareClick(enquiry)}
                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                            title="Share Credentials"
                                        >
                                            <Share2 className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewingEnquiry(enquiry)}
                                            className="text-[#C9A961] hover:text-[#A68B4E] text-sm font-medium"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => setRemoveAccessModal({ enquiryId: enquiry.id, studentName: `${enquiry.first_name} ${enquiry.last_name}` })}
                                            className="text-orange-600 hover:text-orange-800 transition-colors"
                                            title="Remove Exam Access"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(enquiry.id)}
                                            className="text-red-600 hover:text-red-800 transition-colors"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB]">
                    <p className="text-sm text-[#6B6B6B]">
                        Showing {filteredEnquiries.length} of {enquiries.length} enquiries
                    </p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm hover:bg-[#FAFAF8] transition-colors">Previous</button>
                        <button className="px-4 py-2 bg-[#C9A961] text-white rounded-lg text-sm hover:bg-[#A68B4E] transition-colors">1</button>
                        <button className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm hover:bg-[#FAFAF8] transition-colors">Next</button>
                    </div>
                </div>
            </div>

            {/* Assign Test Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-[#1A1A1A]">Assign Test</h3>
                            <button onClick={() => setIsAssignModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-600 mb-4">
                                You are assigning a test to <span className="font-semibold text-gray-900">{selectedIds.size}</span> selected candidates.
                            </p>

                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam Session</label>
                            <select
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                            >
                                <option value="">Select a session...</option>
                                {examSessions.map(session => (
                                    <option key={session.id} value={session.id}>
                                        {session.name} ({new Date(session.start_date).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignTest}
                                disabled={isAssigning || !selectedSessionId}
                                className="flex items-center gap-2 px-6 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal - Reuse existing */}
            {shareModalEnquiry && !isGenerating && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-scale-up">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[#1A1A1A]">Share Credentials</h3>
                            <button onClick={() => setShareModalEnquiry(null)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message Preview</label>
                                <textarea
                                    value={shareMessage}
                                    onChange={(e) => setShareMessage(e.target.value)}
                                    rows={8}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={performShareWhatsApp}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors font-medium"
                                >
                                    <MessageSquare className="h-5 w-5" />
                                    WhatsApp
                                </button>
                                <button
                                    onClick={performShareEmail}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors font-medium"
                                >
                                    <Mail className="h-5 w-5" />
                                    Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal - Reuse existing */}
            {viewingEnquiry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-[#1A1A1A]">Enquiry Details</h2>
                            <button onClick={() => setViewingEnquiry(null)} className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors">
                                <X className="h-6 w-6 text-[#6B6B6B]" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Personal Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">First Name</label><p className="text-base text-[#1A1A1A] mt-1">{viewingEnquiry.first_name}</p></div>
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Last Name</label><p className="text-base text-[#1A1A1A] mt-1">{viewingEnquiry.last_name}</p></div>
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Email</label><p className="text-base text-[#1A1A1A] mt-1">{viewingEnquiry.email}</p></div>
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Phone</label><p className="text-base text-[#1A1A1A] mt-1">{viewingEnquiry.primary_mobile}</p></div>
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Date of Birth</label><p className="text-base text-[#1A1A1A] mt-1">{viewingEnquiry.date_of_birth ? new Date(viewingEnquiry.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p></div>
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Gender</label><p className="text-base text-[#1A1A1A] mt-1 capitalize">{viewingEnquiry.gender || 'N/A'}</p></div>
                                </div>
                            </div>
                            {/* Academic Information */}
                            <div className="border-t border-[#E5E7EB] pt-6">
                                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Academic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Applying for Grade</label><p className="text-base text-[#1A1A1A] mt-1">Grade {viewingEnquiry.applying_grade}</p></div>
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Previous School</label><p className="text-base text-[#1A1A1A] mt-1">{viewingEnquiry.previous_school || 'N/A'}</p></div>
                                </div>
                            </div>
                            {/* Status Information */}
                            <div className="border-t border-[#E5E7EB] pt-6">
                                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-[#6B6B6B]">Overall Status</label>
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingEnquiry.overall_status || 'pending')}`}>
                                                {(viewingEnquiry.overall_status || 'pending').replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div><label className="text-sm font-medium text-[#6B6B6B]">Created Date</label><p className="text-base text-[#1A1A1A] mt-1">{new Date(viewingEnquiry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                                </div>
                            </div>
                        </div>
                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-[#FAFAF8] border-t border-[#E5E7EB] p-6 flex items-center justify-between">
                            <button onClick={() => handleDelete(viewingEnquiry.id)} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"><Trash2 className="h-5 w-5" />Delete Enquiry</button>
                            <button onClick={() => setViewingEnquiry(null)} className="px-6 py-3 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors shadow-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Access Modal */}
            {removeAccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-[#1A1A1A]">
                                    Remove Exam Access - {removeAccessModal.studentName}
                                </h2>
                                <button
                                    onClick={() => setRemoveAccessModal(null)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {isLoadingExams ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#C9A961]" />
                                </div>
                            ) : assignedExams.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No exams assigned to this student.</p>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600 mb-4">Click the remove button next to an exam to revoke access:</p>
                                    {assignedExams.map((exam: any) => (
                                        <div key={exam.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div>
                                                <p className="font-medium text-[#1A1A1A]">
                                                    {/* @ts-ignore */}
                                                    {exam.exam_session?.name || 'Unknown Exam'}
                                                </p>
                                                <p className="text-sm text-gray-500 capitalize">
                                                    Status: {exam.status.replace('_', ' ')}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAccess(exam.id, exam.exam_session?.name || 'this exam')}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setRemoveAccessModal(null)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
