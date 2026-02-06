import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePercentage } from '@/lib/utils'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify authentication (exam controller only)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'exam_controller') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { examSessionId, gradeLevel } = body

        if (!examSessionId) {
            return NextResponse.json(
                { error: 'Missing exam session ID' },
                { status: 400 }
            )
        }

        // Get all students who completed the exam
        const { data: attempts } = await supabase
            .from('student_exam_attempts')
            .select(`
        id,
        student_id,
        admission_enquiries (
          id,
          applying_grade,
          first_name,
          last_name
        )
      `)
            .eq('exam_session_id', examSessionId)
            .eq('status', 'completed')

        if (!attempts || attempts.length === 0) {
            return NextResponse.json(
                { message: 'No completed exams found' },
                { status: 200 }
            )
        }

        // Get all overall scores
        const { data: scores } = await supabase
            .from('student_overall_scores')
            .select('*')
            .eq('exam_session_id', examSessionId)
            .order('total_weighted_score', { ascending: false })

        if (!scores) {
            return NextResponse.json(
                { error: 'Failed to fetch scores' },
                { status: 500 }
            )
        }

        // Calculate overall rankings
        const rankedScores = scores.map((score, index) => ({
            ...score,
            overall_rank: index + 1,
        }))

        // Calculate class-wise rankings
        const gradeGroups: Record<string, typeof scores> = {}

        scores.forEach(score => {
            const grade = score.grade_level || 'unknown'
            if (!gradeGroups[grade]) {
                gradeGroups[grade] = []
            }
            gradeGroups[grade].push(score)
        })

        // Assign class ranks
        Object.keys(gradeGroups).forEach(grade => {
            gradeGroups[grade]
                .sort((a, b) => (b.total_weighted_score || 0) - (a.total_weighted_score || 0))
                .forEach((score, index) => {
                    const matchingScore = rankedScores.find(s => s.id === score.id)
                    if (matchingScore) {
                        matchingScore.class_rank = index + 1
                    }
                })
        })

        // Update scores in database
        const updatePromises = rankedScores.map(score =>
            supabase
                .from('student_overall_scores')
                .update({
                    overall_rank: score.overall_rank,
                    class_rank: score.class_rank,
                })
                .eq('id', score.id)
        )

        await Promise.all(updatePromises)

        // Update admission_enquiries with ranks
        const enquiryUpdatePromises = rankedScores.map(score =>
            supabase
                .from('admission_enquiries')
                .update({
                    final_rank: score.overall_rank,
                    class_rank: score.class_rank,
                    overall_status: score.is_qualified ? 'qualified' : score.status,
                })
                .eq('id', score.student_id)
        )

        await Promise.all(enquiryUpdatePromises)

        return NextResponse.json({
            success: true,
            totalStudents: rankedScores.length,
            rankedScores: rankedScores.map(s => ({
                studentId: s.student_id,
                overallRank: s.overall_rank,
                classRank: s.class_rank,
                totalScore: s.total_weighted_score,
                gradeLevel: s.grade_level,
            })),
        })

    } catch (error) {
        console.error('Calculate rankings error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
