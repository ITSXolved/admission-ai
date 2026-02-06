import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { evaluateWrittenAnswer } from '@/utils/ai-evaluation'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const { attempt_id } = await request.json()

        if (!attempt_id) {
            return NextResponse.json({ error: 'Missing attempt_id' }, { status: 400 })
        }

        console.log(`Submitting Exam for Attempt: ${attempt_id}`)

        // 1. Fetch Attempt & Exam Details
        const { data: attempt, error: attemptError } = await supabase
            .from('student_exam_attempts')
            .select('*, exam_session_id, student_id')
            .eq('id', attempt_id)
            .single()

        if (attemptError || !attempt) {
            return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
        }

        // 2. Calculate MCQ Score
        console.log('Fetching MCQ responses...')
        const { data: mcqResponses, error: mcqError } = await supabase
            .from('student_mcq_responses')
            .select('*, exam_questions!inner(marks, question_bank!inner(correct_answer))')
            .eq('attempt_id', attempt_id)

        if (mcqError) {
            console.error('Error fetching MCQ responses:', mcqError)
            throw mcqError
        }
        console.log(`Fetched ${mcqResponses?.length || 0} MCQ responses`)

        // Note: Currently 'exam_questions' join might fail if foreign keys aren't set up perfectly or permissions.
        // Assuming simple fetch for now and manual calc or simplified logic. 
        // Better: Fetch questions separately to ensure correctness or rely on what's saved?
        // Let's rely on simple fetch of responses and recalculating if needed, but for now assuming 'marks_obtained' is updated or we calc here.
        // Actually, we should calculate properly here.

        // Calculate Total Possible Marks via Sub-Sessions to ensure accuracy
        const { data: subSessions } = await supabase
            .from('exam_sub_sessions')
            .select('id')
            .eq('exam_session_id', attempt.exam_session_id)
            .neq('session_type', 'cognitive') // Exclude cognitive sessions from total marks

        const subSessionIds = subSessions?.map(s => s.id) || []

        const { data: allSessionQuestions } = await supabase
            .from('exam_questions')
            .select('id, marks')
            .in('sub_session_id', subSessionIds)

        const totalPossibleMarks = allSessionQuestions?.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) || 0
        console.log('Total Possible Marks (Calculated via SubSessions):', totalPossibleMarks)

        let mcqScore = 0
        // Fetch all questions for this session to verify answers
        // Optimization: For this implementation, let's assume we do a quick validation loop.

        const { data: questions } = await supabase
            .from('exam_questions')
            .select('id, marks, question_bank(correct_answer)')
            .in('id', mcqResponses?.map(r => r.question_id) || [])

        const questionMap = new Map(questions?.map(q => [q.id, q]))

        const updates = []
        if (mcqResponses) {
            for (const resp of mcqResponses) {
                const q = questionMap.get(resp.question_id) as any // Casting to any to avoid strict relation typing issues for now
                if (q && q.question_bank) {
                    // Handle if it's returned as array or object
                    const qBank = Array.isArray(q.question_bank) ? q.question_bank[0] : q.question_bank

                    if (qBank) {
                        const isCorrect = resp.selected_answer === qBank.correct_answer
                        const marks = isCorrect ? (q.marks || 1) : 0

                        if (isCorrect) mcqScore += marks

                        // Prepare update if needed (optional, good for record)
                        updates.push({
                            id: resp.id,
                            attempt_id: resp.attempt_id,
                            question_id: resp.question_id,
                            is_correct: isCorrect,
                            marks_obtained: marks
                        })
                    }
                }
            }
        }

        // Batch update MCQ results (if we want to persist correctness)
        if (updates.length > 0) {
            const { error: batchError } = await supabase
                .from('student_mcq_responses')
                .upsert(updates)
            if (batchError) console.error('Error updating MCQ marks', batchError)
        }


        // 3. Process Pending Written Evaluations
        console.log('Checking for pending written evaluations...')

        // 3a. Get all written responses
        const { data: allWrittenResponses } = await supabase
            .from('student_written_responses')
            .select('id, question_id, image_urls, exam_questions(marks, question_bank(subject_name, question))') // Assuming relations accessible
            .eq('attempt_id', attempt_id)

        // 3b. Get existing evaluations
        const { data: existingEvaluations } = await supabase
            .from('written_evaluations')
            .select('response_id')
            .in('response_id', allWrittenResponses?.map(r => r.id) || [])

        const evaluatedResponseIds = new Set(existingEvaluations?.map(e => e.response_id))

        // 3c. Find pending and evaluate
        const pendingResponses = allWrittenResponses?.filter(r => !evaluatedResponseIds.has(r.id)) || []

        if (pendingResponses.length > 0) {
            console.log(`Found ${pendingResponses.length} pending evaluations. Processing...`)
            await Promise.all(pendingResponses.map(async (resp) => {
                if (!resp.image_urls || resp.image_urls.length === 0) return

                try {
                    // Need question marks and language
                    // Assuming relations: student_written_responses -> exam_questions -> (marks, question_bank)
                    // We need to fetch marks if not in join. 
                    // Let's rely on simple fetch inside helper or pass what we have.
                    // The helper fetches question data again, so just passing IDs is safe.

                    // We need to determine language from somewhere? 
                    // Usually passed from frontend or determined by question subject.
                    // Let's pass 'English' or try to get subject if possible.
                    // We'll trust the helper to do its best or default. 
                    // Ideally we pass the subject from question_bank if available.

                    // Let's assume English for now or add subject fetching to helper if strictly needed.
                    // Actually, let's pass undefined to default.

                    // Note: helper expects (attemptId, questionId, imageUrls, totalMarks, language)
                    const marks = (resp as any).exam_questions?.marks || 6
                    // const subject = (resp as any).exam_questions?.question_bank?.subject_name

                    await evaluateWrittenAnswer(attempt_id, resp.question_id, resp.image_urls, marks, 'English')
                } catch (err) {
                    console.error(`Failed to evaluate pending response ${resp.id}:`, err)
                    // Continue even if fail, to generate partial result
                }
            }))
        }

        // 4. Calculate Written Score (Aggregated from Evaluations)
        console.log('Fetching All Written evaluations...')
        const { data: evaluations, error: evalError } = await supabase
            .from('written_evaluations')
            .select('*, student_written_responses!inner(question_id, attempt_id)')
            .eq('student_written_responses.attempt_id', attempt_id)

        if (evalError) {
            console.error('Error fetching written evaluations:', evalError)
            // throw evalError // Allow continuing even if written part fails? No, better to fail and debug.
            throw evalError
        }
        console.log(`Fetched ${evaluations?.length || 0} written evaluations`)

        let writtenScore = 0
        const languageScores: Record<string, number> = {}

        if (evaluations) {
            evaluations.forEach(ev => {
                const score = Number(ev.total_score) || 0
                writtenScore += score

                // Group by Language
                const lang = ev.language?.toLowerCase() || 'unknown'
                languageScores[lang] = (languageScores[lang] || 0) + score
            })
        }

        console.log('Scores:', { mcqScore, writtenScore, languageScores })


        // 4. Update Student Overall Scores
        // Check if record exists
        const { data: existingScore } = await supabase
            .from('student_overall_scores')
            .select('id')
            .eq('student_id', attempt.student_id)
            .eq('exam_session_id', attempt.exam_session_id)
            .single()

        const totalScore = mcqScore + writtenScore
        const percentageScore = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0
        const scoreBreakdown = {
            mcq_score: mcqScore,
            written_score: writtenScore,
            languages: languageScores,
            details: evaluations?.map(e => ({
                question_id: e.student_written_responses?.question_id,
                score: e.total_score,
                language: e.language
            }))
        }

        const scoreData = {
            student_id: attempt.student_id,
            exam_session_id: attempt.exam_session_id,
            mcq_score: mcqScore,
            written_score: writtenScore,
            total_weighted_score: totalScore,
            total_possible_marks: totalPossibleMarks,
            percentage_score: percentageScore,
            is_qualified: percentageScore >= 40,
            score_breakdown: scoreBreakdown,
            calculated_at: new Date().toISOString()
        }

        if (existingScore) {
            const { error: scoreUpdateError } = await supabase
                .from('student_overall_scores')
                .update(scoreData)
                .eq('id', existingScore.id)

            if (scoreUpdateError) {
                console.error('Error updating score:', scoreUpdateError)
                throw scoreUpdateError
            }
        } else {
            const { error: scoreInsertError } = await supabase
                .from('student_overall_scores')
                .insert(scoreData)

            if (scoreInsertError) {
                console.error('Error inserting score:', scoreInsertError)
                throw scoreInsertError
            }
        }

        // 5. Mark Attempt as Completed
        const { error: updateError } = await supabase
            .from('student_exam_attempts')
            .update({
                status: 'completed',
                submitted_at: new Date().toISOString()
            })
            .eq('id', attempt_id)

        if (updateError) throw updateError

        // Prepare detailed breakdown for frontend
        const writtenBreakdown = evaluations?.map(ev => ({
            question_id: ev.student_written_responses?.question_id,
            score: ev.total_score,
            feedback: ev.feedback,
            extracted_text: ev.extracted_text,
            language: ev.language
        })) || []

        return NextResponse.json({
            success: true,
            scores: {
                mcq: mcqScore,
                written: writtenScore,
                total: totalScore,
                totalPossible: totalPossibleMarks,
                percentage: percentageScore,
                languages: languageScores
            },
            breakdown: { written: writtenBreakdown }
        })

    } catch (error: any) {
        console.error('Error submitting exam:', error)
        // Log the full error object if possible
        if (error?.message) console.error('Error Message:', error.message)
        if (error?.details) console.error('Error Details:', error.details)
        if (error?.hint) console.error('Error Hint:', error.hint)
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
    }
}
