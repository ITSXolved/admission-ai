'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('') // email or username
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const supabase = createClient()

            // Check if identifier is email or username
            const isEmail = identifier.includes('@')

            let email = identifier

            // If username, fetch email from user_credentials -> profiles
            if (!isEmail) {
                // Use RPC to safely get email (bypassing RLS for username lookup)
                const { data: retrievedEmail, error: rpcError } = await supabase
                    .rpc('get_email_by_username', { username_input: identifier })

                if (rpcError || !retrievedEmail) {
                    setError('Invalid username or password')
                    setLoading(false)
                    return
                }

                email = retrievedEmail
            }

            // Sign in with email and password
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                setError('Invalid credentials')
                setLoading(false)
                return
            }

            // Get user profile to determine role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single()

            if (profileError || !profile) {
                setError('Unable to fetch user profile')
                setLoading(false)
                return
            }

            // Update last login for candidates
            if (!isEmail) {
                await supabase
                    .from('user_credentials')
                    .update({ last_login: new Date().toISOString() })
                    .eq('username', identifier)
            }

            // Redirect based on role
            if (profile.role === 'exam_controller' || profile.role === 'super_admin') {
                router.push('/exam-controller/dashboard')
            } else if (profile.role === 'candidate') {
                router.push('/candidate/dashboard')
            } else {
                setError('Invalid user role')
                setLoading(false)
            }

        } catch (err) {
            console.error('Login error:', err)
            setError('An error occurred during login')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAFAF8] via-[#F5EDD9] to-[#E5D4A6]">
            <div className="w-full max-w-md">
                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-[#C9A961] to-[#8B6F47] flex items-center justify-center shadow-lg">
                            <span className="text-3xl font-bold text-white">A</span>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-[#6B6B6B]">
                            AILT Global Academy Admission Portal
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-[#FEE2E2] border border-[#EF4444] rounded-lg">
                            <p className="text-[#EF4444] text-sm">{error}</p>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email or Username */}
                        <div>
                            <label
                                htmlFor="identifier"
                                className="block text-sm font-medium text-[#1A1A1A] mb-2"
                            >
                                Email or Username
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition-all"
                                placeholder="Enter your email or username"
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-[#1A1A1A] mb-2"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition-all"
                                placeholder="Enter your password"
                                disabled={loading}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#C9A961] hover:bg-[#A68B4E] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                        <p className="text-xs text-[#6B6B6B] text-center mb-2">
                            <strong>Exam Controllers:</strong> Use your email address
                        </p>
                        <p className="text-xs text-[#6B6B6B] text-center">
                            <strong>Candidates:</strong> Use your assigned username
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-[#6B6B6B]">
                        © 2026 AILT Global Academy. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
