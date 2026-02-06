'use client'

import { useState } from 'react'
import StatusCell from './StatusCell'
import WrittenReviewModal from '../../interviews/components/WrittenReviewModal'

export default function PerformanceRow({ student, index }: { student: any, index: number }) {
    const [isReviewOpen, setIsReviewOpen] = useState(false)

    return (
        <>
            <tr className="border-b border-[#F5F5F5] hover:bg-[#FAFAF8] transition-colors">
                <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F5EDD9] text-[#C9A961] font-bold text-sm">
                        {index + 1}
                    </span>
                </td>
                <td className="py-3 px-4 text-sm text-[#1A1A1A] font-medium">
                    {student.admission_enquiries?.first_name} {student.admission_enquiries?.last_name}
                </td>
                <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                    {student.admission_enquiries?.applying_grade}
                </td>
                <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                    {student.mcq_score?.toFixed(1) || 'N/A'}
                </td>
                <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                    <button
                        onClick={() => setIsReviewOpen(true)}
                        className="text-sm font-medium text-[#C9A961] hover:underline hover:text-[#B89648] transition-colors text-left"
                        disabled={!student.written_score}
                    >
                        {student.written_score?.toFixed(1) || 'N/A'}
                    </button>
                </td>

                <td className="py-3 px-4">
                    <span className="text-sm font-bold text-[#C9A961]">
                        {student.total_weighted_score?.toFixed(1)}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <span className="text-sm text-[#6B6B6B]">
                        {student.percentage_score ? `${Number(student.percentage_score).toFixed(1)}%` : 'N/A'}
                    </span>
                </td>
                <td className="py-3 px-4">
                    <StatusCell
                        scoreId={student.id}
                        initialStatus={student.is_qualified}
                    />
                </td>
            </tr>

            <WrittenReviewModal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                studentDetails={{
                    id: student.student_id,
                    name: `${student.admission_enquiries?.first_name} ${student.admission_enquiries?.last_name}`
                }}
                examSessionId={student.exam_session_id}
            />
        </>
    )
}
