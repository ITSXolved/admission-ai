import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { Trophy, TrendingUp, Award } from 'lucide-react'
import PerformanceRow from './components/PerformanceRow'

async function getPerformanceData() {
    const supabase = await createClient()

    const { data: scores, error } = await supabase
        .from('student_overall_scores')
        .select(`
      *,
      admission_enquiries (
        first_name,
        last_name,
        applying_grade
      )
    `)
        .order('total_weighted_score', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Error fetching performance data:', error)
        return []
    }

    return scores || []
}

export default async function PerformancePage() {
    await requireAuth(['exam_controller', 'super_admin'])
    const performanceData = await getPerformanceData()

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
                    Performance Tracking
                </h1>
                <p className="text-[#6B6B6B]">
                    Monitor student performance, scores, and rankings
                </p>
            </div>

            {/* Top Performers */}
            {performanceData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {performanceData.slice(0, 3).map((student, index) => (
                        <div key={student.id} className="bg-white rounded-xl shadow-md p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C9A961]/10 to-transparent rounded-bl-full" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text-4xl font-bold ${index === 0 ? 'text-[#FFD700]' :
                                        index === 1 ? 'text-[#C0C0C0]' :
                                            'text-[#CD7F32]'
                                        }`}>
                                        #{index + 1}
                                    </span>
                                    {index === 0 && <Trophy className="h-8 w-8 text-[#FFD700]" />}
                                    {index === 1 && <Award className="h-8 w-8 text-[#C0C0C0]" />}
                                    {index === 2 && <Award className="h-8 w-8 text-[#CD7F32]" />}
                                </div>
                                <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">
                                    {student.admission_enquiries?.first_name} {student.admission_enquiries?.last_name}
                                </h3>
                                <p className="text-sm text-[#6B6B6B] mb-3">
                                    Grade {student.admission_enquiries?.applying_grade}
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-[#C9A961]">
                                        {student.total_weighted_score?.toFixed(1)}
                                    </span>
                                    <span className="text-sm text-[#6B6B6B]">/ {student.total_possible_marks}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Performance Table */}
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
                                </tr>
                            </thead>
                            <tbody>
                                {performanceData.map((student, index) => (
                                    <PerformanceRow key={student.id} student={student} index={index} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

