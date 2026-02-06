'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard,
    Users,
    FileText,
    ClipboardList,
    BarChart3,
    Calendar,
    Mail,
    Settings,
    LogOut
} from 'lucide-react'

const navigation = [
    { name: 'Dashboard', href: '/exam-controller/dashboard', icon: LayoutDashboard },
    { name: 'Enquiries', href: '/exam-controller/enquiries', icon: Users },
    { name: 'Exam Config', href: '/exam-controller/exam-config', icon: FileText },
    { name: 'Performance', href: '/exam-controller/performance', icon: BarChart3 },
    { name: 'Interviews', href: '/exam-controller/interviews', icon: Calendar },
    { name: 'Communication', href: '/exam-controller/communication', icon: Mail },
]

export default function ExamControllerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#1A1A1A] text-white flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#C9A961] to-[#8B6F47] flex items-center justify-center">
                            <span className="text-xl font-bold">A</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-sm">AILT Global</h1>
                            <p className="text-xs text-[#C9A961]">Exam Controller</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <a
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-[#C9A961] text-white shadow-lg'
                                    : 'text-[#B0B0B0] hover:bg-[#2A2A2A] hover:text-white'
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium text-sm">{item.name}</span>
                            </a>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[#2A2A2A] space-y-2">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#B0B0B0] hover:bg-[#2A2A2A] hover:text-white transition-all"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium text-sm">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
