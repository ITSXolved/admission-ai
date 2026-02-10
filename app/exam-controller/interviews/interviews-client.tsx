'use client'

import { useState } from 'react'
import { Download, Search, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import CandidateRow from './components/CandidateRow'

interface InterviewsClientProps {
    initialCandidates: any[]
}

export default function InterviewsClient({ initialCandidates }: InterviewsClientProps) {
    const [candidates, setCandidates] = useState(initialCandidates)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateStart, setDateStart] = useState('')
    const [dateEnd, setDateEnd] = useState('')

    // Filter Logic
    const filteredCandidates = candidates.filter(candidate => {
        const student = candidate.admission_enquiries
        const matchesSearch =
            student?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student?.primary_mobile?.includes(searchTerm)

        const currentStatus = candidate.interview_status || 'pending'
        const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter

        let matchesDate = true
        if (dateStart && dateEnd) {
            const interviewDate = candidate.interview_date ? new Date(candidate.interview_date) : null
            const start = new Date(dateStart)
            const end = new Date(dateEnd)
            end.setHours(23, 59, 59)

            if (interviewDate) {
                matchesDate = interviewDate >= start && interviewDate <= end
            } else {
                matchesDate = false // If filtering by date, exclude those without dates
            }
        }

        return matchesSearch && matchesStatus && matchesDate
    })

    const handleExportPDF = () => {
        const doc = new jsPDF()

        // Title
        doc.setFontSize(18)
        doc.setTextColor(26, 26, 26)
        doc.text('Interview Candidates Report', 14, 20)

        // Meta info
        doc.setFontSize(10)
        doc.setTextColor(107, 107, 107)
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 28)
        if (dateStart && dateEnd) {
            doc.text(`Period: ${dateStart} to ${dateEnd}`, 14, 33)
        }

        // Group by Grade
        const groupedData: Record<string, any[]> = {}

        filteredCandidates.forEach(c => {
            const grade = c.admission_enquiries?.applying_grade || 'Unknown Grade'
            if (!groupedData[grade]) {
                groupedData[grade] = []
            }
            groupedData[grade].push(c)
        })

        // Sort Grades (numeric ideally)
        const sortedGrades = Object.keys(groupedData).sort((a, b) => {
            // Handle "Grade 1", "Grade 2" vs "Unknown"
            const numA = parseInt(a.replace(/[^0-9]/g, ''))
            const numB = parseInt(b.replace(/[^0-9]/g, ''))
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB
            return a.localeCompare(b)
        })

        let finalY = dateStart && dateEnd ? 40 : 35

        sortedGrades.forEach(grade => {
            // Grade Header
            doc.setFontSize(14)
            doc.setTextColor(201, 169, 97) // Gold color
            doc.text(`Grade ${grade}`, 14, finalY)
            finalY += 5

            const tableData = groupedData[grade].map(c => [
                `${c.admission_enquiries?.first_name} ${c.admission_enquiries?.last_name}`,
                c.admission_enquiries?.primary_mobile || '-',
                c.interview_date ? new Date(c.interview_date).toLocaleDateString() : 'Not Scheduled',
                c.interview_status ? c.interview_status.replace(/_/g, ' ').toUpperCase() : 'PENDING',
                c.fee_agreed ? `INR ${c.fee_agreed}` : '-',
                c.remarks || '-'
            ])

            autoTable(doc, {
                startY: finalY,
                head: [['Candidate', 'Contact', 'Interview Date', 'Status', 'Fee Agreed', 'Remarks']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [245, 245, 245], textColor: [26, 26, 26], fontStyle: 'bold', lineWidth: 0.1, lineColor: [229, 231, 235] },
                bodyStyles: { textColor: [55, 65, 81], fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 35 }, // Name
                    1: { cellWidth: 25 }, // Contact
                    2: { cellWidth: 25 }, // Date
                    3: { cellWidth: 25 }, // Status
                    4: { cellWidth: 25 }, // Fee
                    5: { cellWidth: 'auto' } // Remarks
                },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    // Footer
                }
            })

            // Update finalY for next table
            finalY = (doc as any).lastAutoTable.finalY + 15
        })

        doc.save(`interviews-report-${new Date().toISOString().split('T')[0]}.pdf`)
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
                        Interview Management
                    </h1>
                    <p className="text-[#6B6B6B]">
                        Manage interviews for qualified candidates ({candidates.length})
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {/* Filters */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name/phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="qualified">Qualified</option>
                        <option value="waiting_list">Waiting List</option>
                        <option value="rejected">Rejected</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                    </select>

                    <div className="flex items-center gap-2 bg-white px-2 py-1 border border-gray-200 rounded-lg">
                        <input
                            type="date"
                            value={dateStart}
                            onChange={e => setDateStart(e.target.value)}
                            className="text-sm border-none focus:ring-0 p-1"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={e => setDateEnd(e.target.value)}
                            className="text-sm border-none focus:ring-0 p-1"
                        />
                    </div>

                    <button
                        onClick={handleExportPDF}
                        disabled={filteredCandidates.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C9A961] text-white rounded-lg hover:bg-[#A68B4E] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="h-4 w-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#FAFAF8] border-b border-[#E5E7EB]">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Candidate</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Exam</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Written %</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Interview Score</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Schedule</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Admission</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Remarks</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-gray-500">
                                        No candidates match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map((candidate: any) => (
                                    <CandidateRow key={candidate.id} candidate={candidate} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
