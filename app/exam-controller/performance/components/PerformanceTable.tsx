'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import PerformanceRow from './PerformanceRow'

export default function PerformanceTable({ initialData }: { initialData: any[] }) {
    const [performanceData, setPerformanceData] = useState(initialData)

    const handleDelete = (scoreId: string) => {
        setPerformanceData(prev => prev.filter(student => student.id !== scoreId))
    }

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB]">
                <h2 className="text-xl font-bold text-[#1A1A1A]">All Students</h2>
            </div>

            {performanceData.length === 0 ? (
                <div className="p-12 text-center">
                    <TrendingUp className="h-16 w-16 text-[#C9A961] mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
                        No Performance Data Yet
                    </h3>
                    <p className="text-[#6B6B6B]">
                        Student performance data will appear here once exams are completed
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#FAFAF8] border-b border-[#E5E7EB]">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Rank</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Name</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Grade</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">MCQ Score</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Written Score</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Total Score</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Percentage</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performanceData.map((student, index) => (
                                <PerformanceRow
                                    key={student.id}
                                    student={student}
                                    index={index}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
