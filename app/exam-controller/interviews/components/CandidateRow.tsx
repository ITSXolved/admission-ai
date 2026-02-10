'use client'

import { useState } from 'react'
import ScoreInput from './ScoreInput'
import StatusToggle from './StatusToggle'
import Scheduler from './Scheduler'
import WhatsAppSender from './WhatsAppSender'
import AdmissionDetails from './AdmissionDetails'
import WrittenReviewModal from './WrittenReviewModal'
import RemarksInput from './RemarksInput'

export default function CandidateRow({ candidate }: { candidate: any }) {
    const [isReviewOpen, setIsReviewOpen] = useState(false)
    const student = candidate.admission_enquiries
    // @ts-ignore
    const examName = candidate.exam_session?.name || 'Unknown Exam'

    return (
        <>
            <tr className="border-b border-[#F5F5F5] hover:bg-[#FAFAF8]">
                <td className="py-3 px-4">
                    <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                            {student?.first_name} {student?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{student?.primary_mobile}</p>
                    </div>
                </td>
                <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                    {examName}
                </td>
                <td className="py-3 px-4">
                    <button
                        onClick={() => setIsReviewOpen(true)}
                        className="text-sm font-medium text-[#C9A961] hover:underline hover:text-[#B89648] transition-colors text-left"
                    >
                        {Number(candidate.percentage_score).toFixed(1)}%
                    </button>
                    {/* Optional: Show written score explicitly if space allows, or tooltip */}
                </td>
                <td className="py-3 px-4">
                    <ScoreInput
                        scoreId={candidate.id}
                        initialScore={candidate.interview_score}
                    />
                </td>
                <td className="py-3 px-4">
                    <StatusToggle
                        scoreId={candidate.id}
                        initialStatus={candidate.interview_status}
                    />
                </td>
                <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                        <Scheduler
                            scoreId={candidate.id}
                            initialDate={candidate.interview_date}
                        />
                        {candidate.interview_date && (
                            <span className="text-xs text-gray-500">
                                {new Date(candidate.interview_date).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </td>
                <td className="py-3 px-4">
                    <AdmissionDetails
                        scoreId={candidate.id}
                        details={{
                            fee_agreed: candidate.fee_agreed,
                            payment_mode: candidate.payment_mode,
                            installments_count: candidate.installments_count,
                            residence_type: candidate.residence_type
                        }}
                    />
                </td>
                <td className="py-3 px-4">
                    <RemarksInput
                        scoreId={candidate.id}
                        initialRemarks={candidate.remarks}
                    />
                </td>
                <td className="py-3 px-4">
                    <WhatsAppSender
                        studentName={`${student?.first_name} ${student?.last_name}`}
                        phone={student?.primary_mobile}
                        interviewDate={candidate.interview_date}
                    />
                </td>
            </tr>

            <WrittenReviewModal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                studentDetails={{
                    id: candidate.student_id,
                    name: `${student?.first_name} ${student?.last_name}`
                }}
                examSessionId={candidate.exam_session_id}
            />
        </>
    )
}
