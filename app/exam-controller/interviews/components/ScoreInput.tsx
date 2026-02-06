'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ScoreInput({
    scoreId,
    initialScore
}: {
    scoreId: string
    initialScore: number | null
}) {
    const [score, setScore] = useState<string>(initialScore?.toString() || '')
    const [isUpdating, setIsUpdating] = useState(false)
    const [saved, setSaved] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleBlur = async () => {
        if (score === initialScore?.toString()) return
        if (!score) return

        setIsUpdating(true)
        const numScore = parseFloat(score)

        if (isNaN(numScore) || numScore < 0 || numScore > 20) {
            alert('Score must be between 0 and 20')
            setScore(initialScore?.toString() || '')
            setIsUpdating(false)
            return
        }

        try {
            const { error } = await supabase
                .from('student_overall_scores')
                .update({ interview_score: numScore })
                .eq('id', scoreId)

            if (error) throw error

            setSaved(true)
            router.refresh()
            setTimeout(() => setSaved(false), 2000)
        } catch (error) {
            console.error('Error updating score:', error)
            alert('Failed to update score')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="relative w-20">
            <input
                type="number"
                min="0"
                max="20"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                onBlur={handleBlur}
                disabled={isUpdating}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#C9A961] focus:ring-1 focus:ring-[#C9A961]"
                placeholder="-"
            />
            <span className="absolute right-[-20px] top-1 text-xs text-gray-400">/20</span>
            {isUpdating && (
                <div className="absolute right-2 top-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-[#C9A961]" />
                </div>
            )}
            {saved && (
                <div className="absolute right-[-40px] top-1.5">
                    <Check className="h-3 w-3 text-green-500" />
                </div>
            )}
        </div>
    )
}
