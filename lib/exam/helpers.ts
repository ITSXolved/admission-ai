import { createClient } from '@/lib/supabase/server'
import { ExamSession } from '@/lib/types/database'

/**
 * Check if an exam is currently active based on date range
 */
export function isExamActive(exam: ExamSession): boolean {
    const now = new Date()
    const startDate = new Date(exam.start_date)
    const endDate = new Date(exam.end_date)

    return exam.is_active && now >= startDate && now <= endDate
}

/**
 * Calculate remaining time in seconds for an exam
 */
export function calculateRemainingTime(
    startedAt: string,
    durationMinutes: number,
    timeRemainingSeconds?: number | null
): number {
    if (timeRemainingSeconds !== null && timeRemainingSeconds !== undefined) {
        return timeRemainingSeconds
    }

    const startTime = new Date(startedAt).getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - startTime) / 1000)
    const totalSeconds = durationMinutes * 60

    return Math.max(0, totalSeconds - elapsedSeconds)
}

/**
 * Check if exam time has expired
 */
export function isExamExpired(
    startedAt: string,
    durationMinutes: number,
    timeRemainingSeconds?: number | null
): boolean {
    return calculateRemainingTime(startedAt, durationMinutes, timeRemainingSeconds) <= 0
}

/**
 * Get active exam session
 */
export async function getActiveExamSession(schoolId?: string) {
    const supabase = await createClient()

    const query = supabase
        .from('exam_sessions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())

    if (schoolId) {
        query.eq('school_id', schoolId)
    }

    const { data } = await query.single()

    return data
}

/**
 * Calculate MCQ score for a student
 */
export async function calculateMCQScore(attemptId: string) {
    const supabase = await createClient()

    const { data: responses } = await supabase
        .from('student_mcq_responses')
        .select('marks_obtained, is_correct')
        .eq('attempt_id', attemptId)

    if (!responses) return { score: 0, totalQuestions: 0, correctAnswers: 0 }

    const score = responses.reduce((sum, r) => sum + (r.marks_obtained || 0), 0)
    const correctAnswers = responses.filter(r => r.is_correct).length

    return {
        score,
        totalQuestions: responses.length,
        correctAnswers
    }
}

/**
 * Calculate overall weighted score
 */
export function calculateWeightedScore(
    mcqScore: number,
    mcqWeightage: number,
    writtenScore: number,
    writtenWeightage: number,
    cognitiveScore: number,
    cognitiveWeightage: number
): number {
    return (
        (mcqScore * mcqWeightage / 100) +
        (writtenScore * writtenWeightage / 100) +
        (cognitiveScore * cognitiveWeightage / 100)
    )
}

/**
 * Determine qualification status based on criteria
 */
export async function determineQualificationStatus(
    examSessionId: string,
    overallPercentage: number
): Promise<'qualified' | 'waiting_list' | 'rejected'> {
    const supabase = await createClient()

    // Get overall qualifying criteria
    const { data: criteria } = await supabase
        .from('qualifying_criteria')
        .select('minimum_percentage')
        .eq('exam_session_id', examSessionId)
        .is('sub_session_id', null)
        .is('subject_id', null)
        .single()

    if (!criteria) return 'rejected'

    const minPercentage = criteria.minimum_percentage || 50

    if (overallPercentage >= minPercentage) {
        return 'qualified'
    } else if (overallPercentage >= minPercentage * 0.8) {
        // Within 80% of pass mark goes to waiting list
        return 'waiting_list'
    } else {
        return 'rejected'
    }
}

/**
 * Auto-submit expired exams
 */
export async function autoSubmitExpiredExams() {
    const supabase = await createClient()

    // Find all in-progress attempts where time has expired
    const { data: attempts } = await supabase
        .from('student_exam_attempts')
        .select('*, exam_sessions(*)')
        .eq('status', 'in_progress')

    if (!attempts) return

    for (const attempt of attempts) {
        if (isExamExpired(
            attempt.started_at,
            attempt.exam_sessions.duration_minutes,
            attempt.time_remaining_seconds
        )) {
            await supabase
                .from('student_exam_attempts')
                .update({
                    status: 'expired',
                    submitted_at: new Date().toISOString(),
                    time_remaining_seconds: 0
                })
                .eq('id', attempt.id)
        }
    }
}
