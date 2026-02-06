import { LucideIcon } from 'lucide-react'

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    color?: 'gold' | 'blue' | 'green' | 'red'
}

const colorClasses = {
    gold: 'from-[#C9A961] to-[#8B6F47]',
    blue: 'from-[#3B82F6] to-[#1D4ED8]',
    green: 'from-[#10B981] to-[#059669]',
    red: 'from-[#EF4444] to-[#DC2626]',
}

export function StatCard({ title, value, icon: Icon, trend, color = 'gold' }: StatCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-[#6B6B6B] mb-1">{title}</p>
                    <p className="text-3xl font-bold text-[#1A1A1A] mb-2">{value}</p>
                    {trend && (
                        <div className="flex items-center gap-1">
                            <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-[#6B6B6B]">vs last month</span>
                        </div>
                    )}
                </div>
                <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
            </div>
        </div>
    )
}
