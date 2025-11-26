-- Migration: Create youtube_videos table
-- Created: 2025-01-31
-- Description: Stores metadata for uploaded YouTube videos

CREATE TABLE IF NOT EXISTS public.youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  language TEXT DEFAULT 'en',
  privacy_status TEXT DEFAULT 'private' CHECK (privacy_status IN ('private', 'unlisted', 'public')),
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_youtube_videos_user_id ON public.youtube_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_video_id ON public.youtube_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_created_at ON public.youtube_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_privacy_status ON public.youtube_videos(privacy_status);

-- Enable Row Level Security
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for youtube_videos
CREATE POLICY "Users can view their own videos"
  ON public.youtube_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
  ON public.youtube_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.youtube_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON public.youtube_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.youtube_videos IS 'Stores metadata for uploaded YouTube videos';
COMMENT ON COLUMN public.youtube_videos.video_id IS 'YouTube video ID (unique identifier from YouTube)';
COMMENT ON COLUMN public.youtube_videos.tags IS 'Array of video tags';
COMMENT ON COLUMN public.youtube_videos.privacy_status IS 'Video privacy status: private, unlisted, or public';

