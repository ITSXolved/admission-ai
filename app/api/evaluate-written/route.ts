import { NextResponse } from 'next/server'
import { evaluateWrittenAnswer } from '@/utils/ai-evaluation'

export async function POST(request: Request) {
    try {
        const { attempt_id, question_id, image_urls, marks_per_question, language } = await request.json()

        if (!attempt_id || !question_id || !image_urls || image_urls.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const evaluation = await evaluateWrittenAnswer(
            attempt_id,
            question_id,
            image_urls,
            marks_per_question,
            language
        )

        return NextResponse.json({ success: true, evaluation })

    } catch (error: any) {
        console.error('AI Evaluation API Error:', error)
        return NextResponse.json({ error: error.message || 'Evaluation failed' }, { status: 500 })
    }
}
