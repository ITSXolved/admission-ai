export type UserRole = 'exam_controller' | 'candidate' | 'super_admin'
export type ExamStatus = 'not_started' | 'in_progress' | 'completed' | 'expired'
export type StudentStatus = 'applied' | 'appeared_test' | 'qualified' | 'waiting_list' | 'rejected' | 'called_for_interview' | 'admitted'
export type SessionType = 'mcq' | 'written' | 'cognitive'
export type CognitiveTestType = 'digit_span_forward' | 'digit_span_backward' | 'digit_span_sequencing' | 'flanker_task' | 'set_shifting'
export type LanguageType = 'english' | 'hindi' | 'gujarati'

// Database Types
export interface Profile {
    id: string
    full_name: string | null
    email: string | null
    role: UserRole
    school_id: string | null
    created_at: string
    updated_at: string
}

export interface AdmissionEnquiry {
    id: string
    first_name: string
    middle_name: string | null
    last_name: string
    date_of_birth: string
    gender: string
    current_grade: string
    applying_grade: string
    current_school: string
    current_board: string
    interests: string[]
    has_heard_aet: string
    video_link: string | null
    father_name: string
    father_occupation: string | null
    mother_name: string
    mother_occupation: string | null
    primary_mobile: string
    email: string
    residential_address: string
    source: string
    source_other: string | null
    created_at: string
    updated_at: string
    test_scheduled_at: string | null
    test_password: string | null
    test_status: string
    school_id: string | null
    exam_status: ExamStatus
    overall_status: StudentStatus
    appeared_test: boolean
    qualified_to_interview: boolean
    fee_paid: boolean
    docs_submitted: boolean
    interview_scheduled_at: string | null
    final_rank: number | null
    class_rank: number | null
}

export interface ExamSession {
    id: string
    school_id: string | null
    name: string
    description: string | null
    start_date: string
    end_date: string
    duration_minutes: number
    is_active: boolean
    created_at: string
    updated_at: string
    created_by: string | null
}

export interface ExamSubSession {
    id: string
    exam_session_id: string
    session_type: SessionType
    name: string
    description: string | null
    weightage: number
    duration_minutes: number | null
    sequence_order: number
    created_at: string
}

export interface ExamSubject {
    id: string
    sub_session_id: string
    name: string
    description: string | null
    weightage: number
    marks_per_question: number
    created_at: string
}

export interface QuestionBank {
    id: string
    school_id: string | null
    type: 'mcq' | 'written' | 'cognitive'
    question_text: string
    options: Record<string, string> | null
    correct_answer: string | null
    marks: number
    subject: string | null
    difficulty: string
    created_at: string
    grade_level: string | null
}

export interface ExamQuestion {
    id: string
    subject_id: string | null
    sub_session_id: string | null
    question_bank_id: string | null
    marks: number
    sequence_order: number | null
    is_active: boolean
    created_at: string
}

export interface StudentExamAttempt {
    id: string
    student_id: string
    exam_session_id: string
    started_at: string
    submitted_at: string | null
    time_remaining_seconds: number | null
    status: ExamStatus
    ip_address: string | null
    user_agent: string | null
}

export interface StudentMCQResponse {
    id: string
    attempt_id: string
    question_id: string
    selected_answer: string | null
    is_correct: boolean | null
    marks_obtained: number
    time_spent_seconds: number | null
    marked_for_review: boolean
    answered_at: string
}

export interface StudentWrittenResponse {
    id: string
    attempt_id: string
    question_id: string
    image_urls: string[]
    uploaded_at: string
    evaluation_status: string
}

export interface WrittenEvaluation {
    id: string
    written_response_id: string
    extracted_text: string | null
    language: LanguageType
    grammar_score: number | null
    vocabulary_score: number | null
    coherence_score: number | null
    legibility_score: number | null
    content_relevance_score: number | null
    total_score: number | null
    feedback: string | null
    evaluated_at: string
    evaluated_by: string
}

export interface CognitiveTestConfig {
    id: string
    sub_session_id: string | null
    test_type: CognitiveTestType
    name: string
    instructions_english: string
    instructions_hindi: string
    difficulty_level: string
    time_limit_seconds: number | null
    parameters: Record<string, any> | null
    created_at: string
}

export interface CognitiveTestResult {
    id: string
    attempt_id: string
    test_config_id: string
    test_type: CognitiveTestType
    score: number | null
    accuracy_percentage: number | null
    average_reaction_time_ms: number | null
    max_span_achieved: number | null
    detailed_results: Record<string, any> | null
    completed_at: string
}

export interface StudentOverallScore {
    id: string
    student_id: string
    exam_session_id: string
    mcq_score: number
    mcq_percentage: number
    written_score: number
    written_percentage: number
    cognitive_score: number
    cognitive_percentage: number
    total_weighted_score: number
    overall_percentage: number
    overall_rank: number | null
    class_rank: number | null
    grade_level: string | null
    is_qualified: boolean
    status: StudentStatus
    calculated_at: string
}

export interface StudentSubjectScore {
    id: string
    overall_score_id: string
    subject_id: string
    subject_name: string
    total_questions: number
    correct_answers: number
    marks_obtained: number
    total_marks: number
    percentage: number
}

export interface InterviewSchedule {
    id: string
    school_id: string | null
    exam_session_id: string | null
    start_date: string
    end_date: string
    start_time: string
    end_time: string
    slot_duration_minutes: number
    created_at: string
    created_by: string | null
}

export interface InterviewSlot {
    id: string
    schedule_id: string
    student_id: string | null
    interview_date: string
    interview_time: string
    duration_minutes: number
    status: string
    interviewer_notes: string | null
    created_at: string
}

export interface MessageTemplate {
    id: string
    school_id: string | null
    name: string
    type: string
    subject: string | null
    body: string
    variables: string[]
    created_at: string
    created_by: string | null
    updated_at: string
}
