-- Migration: Add content_generations table for AI Studio
-- Created: 2025-01-31
-- Description: Stores AI-generated content history with provider tracking

-- Create content_generations table
CREATE TABLE IF NOT EXISTS public.content_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('posts', 'responses', 'descriptions', 'faqs')),
  prompt TEXT NOT NULL,
  tone TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('groq', 'deepseek', 'together', 'openai')),
  generated_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_generations_user_id ON public.content_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_content_type ON public.content_generations(content_type);
CREATE INDEX IF NOT EXISTS idx_content_generations_created_at ON public.content_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_generations_user_created ON public.content_generations(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_generations
CREATE POLICY "Users can view their own content generations"
  ON public.content_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content generations"
  ON public.content_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content generations"
  ON public.content_generations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content generations"
  ON public.content_generations FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.content_generations IS 'Stores AI-generated content for AI Studio feature';
COMMENT ON COLUMN public.content_generations.content_type IS 'Type of content: posts, responses, descriptions, or faqs';
COMMENT ON COLUMN public.content_generations.prompt IS 'User prompt used to generate content';
COMMENT ON COLUMN public.content_generations.tone IS 'Tone style used for generation';
COMMENT ON COLUMN public.content_generations.provider IS 'AI provider used: groq, deepseek, together, or openai';
COMMENT ON COLUMN public.content_generations.generated_content IS 'The AI-generated content';
COMMENT ON COLUMN public.content_generations.metadata IS 'Additional metadata in JSON format';
