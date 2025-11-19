-- Create the question_auto_answers_log table
CREATE TABLE question_auto_answers_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES gmb_questions(id),
  user_id UUID REFERENCES auth.users(id),
  answer_text TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  ai_provider TEXT,
  ai_model TEXT,
  context_used JSONB,
  question_category TEXT,
  language_detected TEXT,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update the auto_reply_settings table
ALTER TABLE auto_reply_settings
ADD COLUMN answer_hours_questions BOOLEAN DEFAULT true,
ADD COLUMN answer_location_questions BOOLEAN DEFAULT true,
ADD COLUMN answer_services_questions BOOLEAN DEFAULT true,
ADD COLUMN answer_pricing_questions BOOLEAN DEFAULT true,
ADD COLUMN answer_general_questions BOOLEAN DEFAULT false,
ADD COLUMN language_preference TEXT DEFAULT 'auto',
ADD COLUMN tone TEXT DEFAULT 'professional',
ADD COLUMN include_business_name BOOLEAN DEFAULT true,
ADD COLUMN add_call_to_action BOOLEAN DEFAULT true;
