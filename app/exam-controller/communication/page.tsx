import { requireAuth } from '@/lib/auth/helpers'
import { Mail, MessageSquare, Send } from 'lucide-react'

export default async function CommunicationPage() {
    await requireAuth(['exam_controller', 'super_admin'])

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
                    Communication Center
                </h1>
                <p className="text-[#6B6B6B]">
                    Send emails and WhatsApp messages to students and parents
                </p>
            </div>

            {/* Communication Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Email */}
                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center">
                            <Mail className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
                                Email Communication
                            </h3>
                            <p className="text-sm text-[#6B6B6B] mb-4">
                                Send bulk emails to students with credentials, results, or updates
                            </p>
                            <button className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors text-sm">
                                <Send className="h-4 w-4" />
                                Compose Email
                            </button>
                        </div>
                    </div>
                </div>

                {/* WhatsApp */}
                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center">
                            <MessageSquare className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
                                WhatsApp Messages
                            </h3>
                            <p className="text-sm text-[#6B6B6B] mb-4">
                                Generate WhatsApp links to send messages directly to parents
                            </p>
                            <button className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors text-sm">
                                <Send className="h-4 w-4" />
                                Generate Links
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message Templates */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">
                    Message Templates
                </h2>
                <div className="space-y-3">
                    {[
                        { name: 'Exam Credentials', description: 'Send login credentials to candidates' },
                        { name: 'Exam Reminder', description: 'Remind students about upcoming exams' },
                        { name: 'Results Notification', description: 'Notify students about their results' },
                        { name: 'Interview Invitation', description: 'Invite qualified candidates for interview' },
                        { name: 'Admission Confirmation', description: 'Confirm admission for selected students' },
                    ].map((template) => (
                        <div key={template.name} className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg hover:bg-[#FAFAF8] transition-colors">
                            <div>
                                <h4 className="font-medium text-[#1A1A1A] mb-1">{template.name}</h4>
                                <p className="text-sm text-[#6B6B6B]">{template.description}</p>
                            </div>
                            <button className="px-4 py-2 text-sm text-[#C9A961] border border-[#C9A961] rounded-lg hover:bg-[#F5EDD9] transition-colors">
                                Use Template
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
