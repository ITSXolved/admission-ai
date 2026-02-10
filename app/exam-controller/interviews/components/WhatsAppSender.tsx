'use client'


import { useState, useRef, useEffect } from 'react'
import { MessageSquare, ExternalLink, X } from 'lucide-react'

// Simple Modal Component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    )
}

const TEMPLATES = [
    {
        id: 'qualified',
        title: 'Qualified for Interview',
        text: "Salam {name}, Congratualtions! You have been shortlisted for the interview round at AILT Global Academy. Your interview is scheduled for {date}. Please be present on time."
    },
    {
        id: 'selected',
        title: 'Selected for Admission',
        text: "Salam {name}, We are pleased to inform you that you have been SELECTED for admission at AILT Global Academy! Please proceed with the admission formalities by visiting the campus."
    },
    {
        id: 'waiting_list',
        title: 'Waiting List Update',
        text: "Salam {name}, You have been placed on the Waiting List for admission at AILT Global Academy. We will notify you if a seat becomes available."
    },
    {
        id: 'rejected',
        title: 'Admission Status Update',
        text: "Salam {name}, We regret to inform you that you have not been selected for admission at AILT Global Academy at this time. We wish you the best in your future endeavors."
    },
    {
        id: 'reminder',
        title: 'Interview Reminder',
        text: "Salam {name}, This is a reminder for your upcoming interview at AILT Global Academy scheduled on {date}."
    }
]

export default function WhatsAppSender({
    studentName,
    phone,
    interviewDate
}: {
    studentName: string
    phone: string
    interviewDate: string | null
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])

    const formatMessage = (text: string) => {
        let msg = text.replace('{name}', studentName)
        const dateStr = interviewDate ? new Date(interviewDate).toLocaleString() : "[Date not set]"
        msg = msg.replace('{date}', dateStr)
        return msg
    }

    const handleSend = () => {
        const message = formatMessage(selectedTemplate.text)
        const encodedMessage = encodeURIComponent(message)
        const waLink = `https://wa.me/${phone}?text=${encodedMessage}`
        window.open(waLink, '_blank')
        setIsOpen(false)
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-full hover:bg-green-50 text-green-600 transition-colors"
                title="Send WhatsApp Message"
            >
                <MessageSquare className="h-4 w-4" />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Send WhatsApp Message">

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Select Template</label>
                        <div className="grid grid-cols-1 gap-2">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`p-3 text-left rounded-lg text-sm border transition-all ${selectedTemplate.id === t.id
                                        ? 'border-green-500 bg-green-50 text-green-900 ring-1 ring-green-500'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                        }`}
                                >
                                    <span className="font-bold block mb-1">{t.title}</span>
                                    <span className="text-xs opacity-75 line-clamp-2">{formatMessage(t.text)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Preview</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {formatMessage(selectedTemplate.text)}
                        </p>
                    </div>

                    <button
                        onClick={handleSend}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <span className="h-5 w-5 fill-current">
                            {/* Simple WhatsApp-like icon */}
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                        </span>
                        Open WhatsApp
                    </button>

                    <button onClick={() => setIsOpen(false)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-2">
                        Cancel
                    </button>
                </div>
            </Modal>
        </>
    )
}
