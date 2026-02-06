'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [identifier, setIdentifier] = useState('') // email or username
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            const supabase = createClient()
            let email = identifier

            // If input is not an email, try to find email from username
            if (!identifier.includes('@')) {
                const { data: credData, error: credError } = await supabase
                    .from('user_credentials')
                    .select('user_id, profiles!inner(email)')
                    .eq('username', identifier)
                    .single()

                if (credError || !credData || !credData.profiles) {
                    setError('User not found')
                    setLoading(false)
                    return
                }

                email = (credData.profiles as any).email || ''
            }

            // Send password reset email
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (resetError) {
                setError(resetError.message)
            } else {
                setMessage('Check your email for the password reset link.')
            }

        } catch (err) {
            console.error('Reset error:', err)
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAFAF8] via-[#F5EDD9] to-[#E5D4A6]">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
                    <div className="flex justify-center mb-6">
                        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#C9A961] to-[#8B6F47] flex items-center justify-center shadow-lg">
                            <span className="text-2xl font-bold text-white">A</span>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
                            Reset Password
                        </h1>
                        <p className="text-[#6B6B6B]">
                            Enter your email or username to receive a reset link
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-[#FEE2E2] border border-[#EF4444] rounded-lg">
                            <p className="text-[#EF4444] text-sm">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 text-sm">{message}</p>
                        </div>
                    )}

                    <form onSubmit={handleReset} className="space-y-6">
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                                Email or Username
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition-all"
                                placeholder="Enter email or username"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#C9A961] hover:bg-[#A68B4E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-sm text-[#C9A961] hover:text-[#A68B4E] font-medium">
                            Back to Login
                        </Link>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-[#6B6B6B]">
                        © 2026 AILT Global Academy. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
