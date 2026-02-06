import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/stat-card'
import {
    Users,
    UserCheck,
    UserX,
    Clock,
    TrendingUp,
    Award,
    FileText,
    Calendar
} from 'lucide-react'

async function getDashboardStats() {
    const supabase = await createClient()

    // Get total enquiries
    const { count: totalEnquiries } = await supabase
        .from('admission_enquiries')
        .select('*', { count: 'exact', head: true })

    // Get qualified students
    const { count: qualifiedCount } = await supabase
        .from('admission_enquiries')
        .select('*', { count: 'exact', head: true })
        .eq('overall_status', 'qualified')

    // Get pending enquiries
    const { count: pendingCount } = await supabase
        .from('admission_enquiries')
        .select('*', { count: 'exact', head: true })
        .eq('overall_status', 'pending')

    // Get active exams
    const { count: activeExams } = await supabase
        .from('exam_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

    // Get status distribution
    const { data: statusData } = await supabase
        .from('admission_enquiries')
        .select('overall_status')

    const statusDistribution = statusData?.reduce((acc: any, curr) => {
        const status = curr.overall_status || 'pending'
        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {})

    // Get grade-wise distribution
    const { data: gradeData } = await supabase
        .from('admission_enquiries')
        .select('applying_grade')

    const gradeDistribution = gradeData?.reduce((acc: any, curr) => {
        const grade = curr.applying_grade || 'Unknown'
        acc[grade] = (acc[grade] || 0) + 1
        return acc
    }, {})

    // Get recent enquiries
    const { data: recentEnquiries } = await supabase
        .from('admission_enquiries')
        .select('id, first_name, last_name, applying_grade, overall_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    return {
        totalEnquiries: totalEnquiries || 0,
        qualifiedCount: qualifiedCount || 0,
        pendingCount: pendingCount || 0,
        activeExams: activeExams || 0,
        statusDistribution: statusDistribution || {},
        gradeDistribution: gradeDistribution || {},
        recentEnquiries: recentEnquiries || [],
    }
}

export default async function ExamControllerDashboard() {
    const user = await requireAuth(['exam_controller', 'super_admin'])
    const stats = await getDashboardStats()

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
                    Dashboard
                </h1>
                <p className="text-[#6B6B6B]">
                    Welcome back, {user.profile?.full_name || 'Exam Controller'}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Enquiries"
                    value={stats.totalEnquiries}
                    icon={Users}
                    color="gold"
                    trend={{ value: 12, isPositive: true }}
                />
                <StatCard
                    title="Qualified Students"
                    value={stats.qualifiedCount}
                    icon={UserCheck}
                    color="green"
                />
                <StatCard
                    title="Pending Review"
                    value={stats.pendingCount}
                    icon={Clock}
                    color="blue"
                />
                <StatCard
                    title="Active Exams"
                    value={stats.activeExams}
                    icon={FileText}
                    color="red"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Status Distribution */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Status Distribution</h2>
                    <div className="space-y-4">
                        {Object.entries(stats.statusDistribution).map(([status, count]) => {
                            const countNum = count as number
                            const percentage = (countNum / stats.totalEnquiries) * 100
                            const colors: Record<string, string> = {
                                pending: 'bg-blue-500',
                                qualified: 'bg-green-500',
                                not_qualified: 'bg-red-500',
                                called_for_interview: 'bg-yellow-500',
                                admitted: 'bg-purple-500',
                            }
                            return (
                                <div key={status}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-[#1A1A1A] capitalize">
                                            {status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-sm font-bold text-[#6B6B6B]">
                                            {countNum} ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${colors[status] || 'bg-gray-500'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Grade Distribution */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Grade-wise Applications</h2>
                    <div className="space-y-4">
                        {Object.entries(stats.gradeDistribution)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([grade, count]) => {
                                const countNum = count as number
                                const percentage = (countNum / stats.totalEnquiries) * 100
                                return (
                                    <div key={grade}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-[#1A1A1A]">
                                                Grade {grade}
                                            </span>
                                            <span className="text-sm font-bold text-[#6B6B6B]">
                                                {countNum} students
                                            </span>
                                        </div>
                                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-[#C9A961]"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            </div>

            {/* Recent Enquiries */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Recent Enquiries</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#E5E7EB]">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Name</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Grade</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-[#6B6B6B]">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentEnquiries.map((enquiry) => (
                                <tr key={enquiry.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAF8] transition-colors">
                                    <td className="py-3 px-4 text-sm text-[#1A1A1A] font-medium">
                                        {enquiry.first_name} {enquiry.last_name}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                        Grade {enquiry.applying_grade}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${enquiry.overall_status === 'qualified' ? 'bg-green-100 text-green-800' :
                                            enquiry.overall_status === 'not_qualified' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                            {enquiry.overall_status?.replace(/_/g, ' ') || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-[#6B6B6B]">
                                        {new Date(enquiry.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
