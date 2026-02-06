-- ============================================
-- AILT Admission Management System - Database Schema
-- ============================================
-- This schema extends the existing schema with exam management capabilities
-- Run this after the existing_schema.sql

-- ============================================
-- ENUMS AND TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('exam_controller', 'candidate', 'super_admin');
CREATE TYPE exam_status AS ENUM ('not_started', 'in_progress', 'completed', 'expired');
CREATE TYPE student_status AS ENUM ('applied', 'appeared_test', 'qualified', 'waiting_list', 'rejected', 'called_for_interview', 'admitted');
CREATE TYPE session_type AS ENUM ('mcq', 'written', 'cognitive');
CREATE TYPE cognitive_test_type AS ENUM ('digit_span_forward', 'digit_span_backward', 'digit_span_sequencing', 'flanker_task', 'set_shifting');
CREATE TYPE language_type AS ENUM ('english', 'hindi', 'gujarati');

-- ============================================
-- USER MANAGEMENT & AUTHENTICATION
-- ============================================

-- Extend profiles table with new roles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['super_admin'::text, 'school_admin'::text, 'admission_officer'::text, 'candidate'::text, 'exam_controller'::text]));

-- User credentials for candidate login (username/password based)
CREATE TABLE public.user_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admission_enquiry_id uuid REFERENCES public.admission_enquiries(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT user_credentials_pkey PRIMARY KEY (id)
);

-- ============================================
-- EXTEND ADMISSION ENQUIRIES
-- ============================================

-- Add new status tracking columns
ALTER TABLE public.admission_enquiries
ADD COLUMN IF NOT EXISTS exam_status exam_status DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS overall_status student_status DEFAULT 'applied',
ADD COLUMN IF NOT EXISTS appeared_test boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS qualified_to_interview boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fee_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS docs_submitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS interview_scheduled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS final_rank integer,
ADD COLUMN IF NOT EXISTS class_rank integer;

-- ============================================
-- EXAM CONFIGURATION
-- ============================================

-- Master exam session configuration
CREATE TABLE public.exam_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id),
  name text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL, -- Total exam duration
  total_marks integer NOT NULL DEFAULT 100, -- Total marks for the exam
  min_qualification_mark integer DEFAULT 0, -- Minimum marks required to qualify
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT exam_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Exam sub-sessions (MCQ, Written, Cognitive)
CREATE TABLE public.exam_sub_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,
  name text NOT NULL,
  description text,
  weightage numeric(5,2) NOT NULL, -- Percentage weightage (0-100)
  duration_minutes integer,
  sequence_order integer NOT NULL, -- Order of sessions
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_sub_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT valid_weightage CHECK (weightage >= 0 AND weightage <= 100)
);

-- Subjects under MCQ session (Math, English, GK, Islamics)
CREATE TABLE public.exam_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sub_session_id uuid NOT NULL REFERENCES public.exam_sub_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weightage numeric(5,2) NOT NULL,
  marks_per_question integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT valid_subject_weightage CHECK (weightage >= 0 AND weightage <= 100)
);

-- Link questions to exam subjects
CREATE TABLE public.exam_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  sub_session_id uuid REFERENCES public.exam_sub_sessions(id) ON DELETE CASCADE,
  question_bank_id uuid REFERENCES public.question_bank(id) ON DELETE CASCADE,
  marks integer NOT NULL DEFAULT 1,
  sequence_order integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_questions_pkey PRIMARY KEY (id)
);

-- Qualifying criteria
CREATE TABLE public.qualifying_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  sub_session_id uuid REFERENCES public.exam_sub_sessions(id),
  subject_id uuid REFERENCES public.exam_subjects(id),
  minimum_percentage numeric(5,2),
  minimum_marks numeric(10,2),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qualifying_criteria_pkey PRIMARY KEY (id)
);

-- ============================================
-- STUDENT EXAM ATTEMPTS & RESPONSES
-- ============================================

-- Track student exam attempts
CREATE TABLE public.student_exam_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.admission_enquiries(id) ON DELETE CASCADE,
  exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  time_remaining_seconds integer,
  status exam_status DEFAULT 'in_progress',
  ip_address text,
  user_agent text,
  CONSTRAINT student_exam_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT unique_student_exam UNIQUE (student_id, exam_session_id)
);

-- MCQ responses
CREATE TABLE public.student_mcq_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.student_exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  selected_answer text,
  is_correct boolean,
  marks_obtained numeric(10,2) DEFAULT 0,
  time_spent_seconds integer,
  marked_for_review boolean DEFAULT false,
  answered_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_mcq_responses_pkey PRIMARY KEY (id),
  CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);

-- Written assessment responses
CREATE TABLE public.student_written_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.student_exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  image_urls text[], -- Array of image URLs from Supabase Storage
  uploaded_at timestamp with time zone DEFAULT now(),
  evaluation_status text DEFAULT 'pending', -- pending, evaluating, completed
  CONSTRAINT student_written_responses_pkey PRIMARY KEY (id),
  CONSTRAINT unique_written_attempt_question UNIQUE (attempt_id, question_id)
);

-- Written evaluations (AI-generated)
CREATE TABLE public.written_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  written_response_id uuid NOT NULL REFERENCES public.student_written_responses(id) ON DELETE CASCADE,
  extracted_text text,
  language language_type NOT NULL,
  grammar_score numeric(5,2),
  vocabulary_score numeric(5,2),
  coherence_score numeric(5,2),
  legibility_score numeric(5,2),
  content_relevance_score numeric(5,2),
  total_score numeric(10,2),
  feedback text,
  evaluated_at timestamp with time zone DEFAULT now(),
  evaluated_by text DEFAULT 'Google Gemini AI',
  CONSTRAINT written_evaluations_pkey PRIMARY KEY (id)
);

-- ============================================
-- COGNITIVE ASSESSMENTS
-- ============================================

-- Cognitive test configurations
CREATE TABLE public.cognitive_test_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sub_session_id uuid REFERENCES public.exam_sub_sessions(id) ON DELETE CASCADE,
  test_type cognitive_test_type NOT NULL,
  name text NOT NULL,
  instructions_english text NOT NULL,
  instructions_hindi text NOT NULL,
  difficulty_level text DEFAULT 'medium',
  time_limit_seconds integer,
  parameters jsonb, -- Test-specific parameters (e.g., starting digit count, trial count)
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cognitive_test_configs_pkey PRIMARY KEY (id)
);

-- Cognitive test results
CREATE TABLE public.cognitive_test_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.student_exam_attempts(id) ON DELETE CASCADE,
  test_config_id uuid NOT NULL REFERENCES public.cognitive_test_configs(id) ON DELETE CASCADE,
  test_type cognitive_test_type NOT NULL,
  score numeric(10,2),
  accuracy_percentage numeric(5,2),
  average_reaction_time_ms integer,
  max_span_achieved integer, -- For digit span tests
  detailed_results jsonb, -- Store trial-by-trial results
  completed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cognitive_test_results_pkey PRIMARY KEY (id)
);

-- ============================================
-- AGGREGATED SCORES & RANKINGS
-- ============================================

-- Student overall scores and rankings
CREATE TABLE public.student_overall_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.admission_enquiries(id) ON DELETE CASCADE,
  exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  mcq_score numeric(10,2) DEFAULT 0,
  mcq_percentage numeric(5,2) DEFAULT 0,
  written_score numeric(10,2) DEFAULT 0,
  written_percentage numeric(5,2) DEFAULT 0,
  cognitive_score numeric(10,2) DEFAULT 0,
  cognitive_percentage numeric(5,2) DEFAULT 0,
  total_weighted_score numeric(10,2) DEFAULT 0,
  overall_percentage numeric(5,2) DEFAULT 0,
  overall_rank integer,
  class_rank integer,
  grade_level text,
  is_qualified boolean DEFAULT false,
  status student_status DEFAULT 'appeared_test',
  calculated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_overall_scores_pkey PRIMARY KEY (id),
  CONSTRAINT unique_student_exam_score UNIQUE (student_id, exam_session_id)
);

-- Subject-wise performance
CREATE TABLE public.student_subject_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  overall_score_id uuid NOT NULL REFERENCES public.student_overall_scores(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  marks_obtained numeric(10,2) DEFAULT 0,
  total_marks numeric(10,2) DEFAULT 0,
  percentage numeric(5,2) DEFAULT 0,
  CONSTRAINT student_subject_scores_pkey PRIMARY KEY (id)
);

-- ============================================
-- INTERVIEW SCHEDULING
-- ============================================

-- Interview date ranges
CREATE TABLE public.interview_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id),
  exam_session_id uuid REFERENCES public.exam_sessions(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT interview_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT valid_interview_date_range CHECK (end_date >= start_date)
);

-- Individual interview slots
CREATE TABLE public.interview_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.interview_schedules(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.admission_enquiries(id) ON DELETE CASCADE,
  interview_date date NOT NULL,
  interview_time time NOT NULL,
  duration_minutes integer DEFAULT 30,
  status text DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  interviewer_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interview_slots_pkey PRIMARY KEY (id)
);

-- ============================================
-- COMMUNICATION LOGS
-- ============================================

-- Email communication log
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES public.admission_enquiries(id),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'sent', -- sent, failed, pending
  error_message text,
  CONSTRAINT email_logs_pkey PRIMARY KEY (id)
);

-- WhatsApp communication log
CREATE TABLE public.whatsapp_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES public.admission_enquiries(id),
  phone_number text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id)
);

-- ============================================
-- MESSAGE TEMPLATES
-- ============================================

-- Reusable message templates
CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id),
  name text NOT NULL,
  type text NOT NULL, -- email, whatsapp
  subject text, -- For emails
  body text NOT NULL,
  variables text[], -- Available merge fields
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_templates_pkey PRIMARY KEY (id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_user_credentials_username ON public.user_credentials(username);
CREATE INDEX idx_user_credentials_admission ON public.user_credentials(admission_enquiry_id);
CREATE INDEX idx_admission_enquiries_status ON public.admission_enquiries(overall_status);
CREATE INDEX idx_admission_enquiries_exam_status ON public.admission_enquiries(exam_status);
CREATE INDEX idx_admission_enquiries_grade ON public.admission_enquiries(applying_grade);
CREATE INDEX idx_exam_sessions_active ON public.exam_sessions(is_active);
CREATE INDEX idx_exam_sessions_dates ON public.exam_sessions(start_date, end_date);
CREATE INDEX idx_student_attempts_student ON public.student_exam_attempts(student_id);
CREATE INDEX idx_student_attempts_exam ON public.student_exam_attempts(exam_session_id);
CREATE INDEX idx_mcq_responses_attempt ON public.student_mcq_responses(attempt_id);
CREATE INDEX idx_written_responses_attempt ON public.student_written_responses(attempt_id);
CREATE INDEX idx_overall_scores_student ON public.student_overall_scores(student_id);
CREATE INDEX idx_overall_scores_rank ON public.student_overall_scores(overall_rank);
CREATE INDEX idx_overall_scores_grade ON public.student_overall_scores(grade_level);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sub_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifying_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mcq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_written_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_test_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_overall_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Exam Controller Policies (Full access to exam management)
CREATE POLICY "Exam controllers can view all exam data"
  ON public.exam_sessions FOR SELECT
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

CREATE POLICY "Exam controllers can manage exams"
  ON public.exam_sessions FOR ALL
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

-- Candidate Policies (Limited access to their own data)
CREATE POLICY "Candidates can view active exams"
  ON public.exam_sessions FOR SELECT
  USING (is_active = true AND public.get_user_role() = 'candidate');

CREATE POLICY "Candidates can view their own attempts"
  ON public.student_exam_attempts FOR SELECT
  USING (
    student_id IN (
      SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can create their own attempts"
  ON public.student_exam_attempts FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can update their own attempts"
  ON public.student_exam_attempts FOR UPDATE
  USING (
    student_id IN (
      SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Exam controllers can view all attempts"
  ON public.student_exam_attempts
  FOR SELECT
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

CREATE POLICY "Exam controllers can delete attempts"
  ON public.student_exam_attempts
  FOR DELETE
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

-- MCQ Responses
CREATE POLICY "Candidates can manage their own MCQ responses"
  ON public.student_mcq_responses FOR ALL
  USING (
    attempt_id IN (
      SELECT id FROM public.student_exam_attempts 
      WHERE student_id IN (
        SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
      )
    )
  );

-- Written Responses
CREATE POLICY "Candidates can manage their own written responses"
  ON public.student_written_responses FOR ALL
  USING (
    attempt_id IN (
      SELECT id FROM public.student_exam_attempts 
      WHERE student_id IN (
        SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
      )
    )
  );

-- Cognitive Test Results
CREATE POLICY "Candidates can manage their own cognitive results"
  ON public.cognitive_test_results FOR ALL
  USING (
    attempt_id IN (
      SELECT id FROM public.student_exam_attempts 
      WHERE student_id IN (
        SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
      )
    )
  );

-- Overall Scores (Read-only for candidates)
CREATE POLICY "Candidates can view their own scores"
  ON public.student_overall_scores FOR SELECT
  USING (
    student_id IN (
      SELECT admission_enquiry_id FROM public.user_credentials WHERE user_id = auth.uid()
    )
  );

-- Exam controllers can view all student data
CREATE POLICY "Exam controllers can view all student responses"
  ON public.student_mcq_responses FOR SELECT
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

CREATE POLICY "Exam controllers can view all written responses"
  ON public.student_written_responses FOR SELECT
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

CREATE POLICY "Exam controllers can view all cognitive results"
  ON public.cognitive_test_results FOR SELECT
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

CREATE POLICY "Exam controllers can view all scores"
  ON public.student_overall_scores FOR ALL
  USING (public.get_user_role() IN ('exam_controller', 'super_admin'));

-- 6. Exam Structure Policies for Candidates
CREATE POLICY "Candidates can view active sub-sessions"
  ON public.exam_sub_sessions FOR SELECT
  USING (
    exam_session_id IN (
      SELECT id FROM public.exam_sessions WHERE is_active = true
    )
    AND public.get_user_role() = 'candidate'
  );

CREATE POLICY "Candidates can view subjects of active exams"
  ON public.exam_subjects FOR SELECT
  USING (
    sub_session_id IN (
      SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
        SELECT id FROM public.exam_sessions WHERE is_active = true
      )
    )
    AND public.get_user_role() = 'candidate'
  );

CREATE POLICY "Candidates can view questions of active exams"
  ON public.exam_questions FOR SELECT
  USING (
    sub_session_id IN (
      SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
        SELECT id FROM public.exam_sessions WHERE is_active = true
      )
    )
    AND public.get_user_role() = 'candidate'
  );

CREATE POLICY "Candidates can view question details"
  ON public.question_bank FOR SELECT
  USING (
    id IN (
      SELECT question_bank_id FROM public.exam_questions WHERE sub_session_id IN (
        SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
          SELECT id FROM public.exam_sessions WHERE is_active = true
        )
      )
    )
    AND public.get_user_role() = 'candidate'
  );

CREATE POLICY "Candidates can view cognitive test configs"
  ON public.cognitive_test_configs FOR SELECT
  USING (
    sub_session_id IN (
      SELECT id FROM public.exam_sub_sessions WHERE exam_session_id IN (
        SELECT id FROM public.exam_sessions WHERE is_active = true
      )
    )
    AND public.get_user_role() = 'candidate'
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-calculate MCQ scores
CREATE OR REPLACE FUNCTION public.calculate_mcq_score()
RETURNS TRIGGER AS $$
DECLARE
  correct_ans text;
  question_marks numeric;
BEGIN
  -- Get correct answer and marks from question_bank
  SELECT qb.correct_answer, eq.marks INTO correct_ans, question_marks
  FROM public.exam_questions eq
  JOIN public.question_bank qb ON eq.question_bank_id = qb.id
  WHERE eq.id = NEW.question_id;

  -- Check if answer is correct
  IF NEW.selected_answer = correct_ans THEN
    NEW.is_correct := true;
    NEW.marks_obtained := question_marks;
  ELSE
    NEW.is_correct := false;
    NEW.marks_obtained := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_mcq_score
  BEFORE INSERT OR UPDATE ON public.student_mcq_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_mcq_score();

-- Function to update exam attempt status
CREATE OR REPLACE FUNCTION public.update_exam_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL THEN
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_status
  BEFORE UPDATE ON public.student_exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exam_status();

-- Function to update admission_enquiries exam_status
CREATE OR REPLACE FUNCTION public.sync_exam_status_to_enquiry()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.admission_enquiries
  SET 
    exam_status = NEW.status,
    appeared_test = CASE WHEN NEW.status IN ('completed', 'expired') THEN true ELSE appeared_test END
  WHERE id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_exam_status
  AFTER INSERT OR UPDATE ON public.student_exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_exam_status_to_enquiry();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INITIAL DATA / SEED DATA
-- ============================================

-- Insert default message templates
INSERT INTO public.message_templates (name, type, subject, body, variables) VALUES
('Exam Credentials Email', 'email', 'Your AILT Admission Test Credentials', 
'Dear {{first_name}} {{last_name}},

Your admission test has been scheduled. Please find your login credentials below:

Username: {{username}}
Password: {{password}}

Test Date: {{test_date}}
Test Time: {{test_time}}

Please login at: {{login_url}}

Best regards,
AILT Global Academy',
ARRAY['first_name', 'last_name', 'username', 'password', 'test_date', 'test_time', 'login_url']),

('Interview Invitation Email', 'email', 'Interview Invitation - AILT Admission',
'Dear {{first_name}} {{last_name}},

Congratulations! You have been shortlisted for the interview round.

Interview Date: {{interview_date}}
Interview Time: {{interview_time}}

Please arrive 15 minutes early and bring the required documents.

Best regards,
AILT Global Academy',
ARRAY['first_name', 'last_name', 'interview_date', 'interview_time']),

('Exam Credentials WhatsApp', 'whatsapp', NULL,
'Salam {{first_name}}! Your AILT admission test credentials:
Username: {{username}}
Password: {{password}}
Test Date: {{test_date}}
Login: {{login_url}}',
ARRAY['first_name', 'username', 'password', 'test_date', 'login_url']);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.exam_sessions IS 'Master exam configuration with date ranges and duration';
COMMENT ON TABLE public.exam_sub_sessions IS 'Session breakdown (MCQ, Written, Cognitive) with weightages';
COMMENT ON TABLE public.exam_subjects IS 'Subjects under MCQ session (Math, English, GK, Islamics)';
COMMENT ON TABLE public.student_exam_attempts IS 'Tracks individual student exam attempts with timing';
COMMENT ON TABLE public.student_mcq_responses IS 'MCQ answers with auto-grading';
COMMENT ON TABLE public.student_written_responses IS 'Image uploads for written assessments';
COMMENT ON TABLE public.written_evaluations IS 'AI-generated evaluations using Google Gemini';
COMMENT ON TABLE public.cognitive_test_results IS 'Results from cognitive assessments (Digit Span, Flanker, Set-Shifting)';
COMMENT ON TABLE public.student_overall_scores IS 'Aggregated scores, rankings, and qualification status';
