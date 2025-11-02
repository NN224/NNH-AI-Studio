-- Migration: Create gmb_media table for storing GMB media items
-- Created: 2025-02-02
-- Description: Creates gmb_media table to store media items (photos/videos) from Google My Business locations

-- Create gmb_media table
CREATE TABLE IF NOT EXISTS public.gmb_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  external_media_id TEXT NOT NULL, -- e.g., "accounts/123/locations/456/media/789"
  type TEXT, -- e.g., "PHOTO", "VIDEO"
  url TEXT, -- Google URL for the media
  thumbnail_url TEXT, -- Thumbnail URL if available
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- Store full media object from API
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gmb_media_account ON public.gmb_media(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_location ON public.gmb_media(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_user ON public.gmb_media(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_external_id ON public.gmb_media(external_media_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gmb_media_unique ON public.gmb_media(external_media_id, location_id);

-- Enable Row Level Security
ALTER TABLE public.gmb_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmb_media
CREATE POLICY "Users can view their own media"
  ON public.gmb_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media"
  ON public.gmb_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media"
  ON public.gmb_media FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON public.gmb_media FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.gmb_media IS 'Stores media items (photos/videos) from Google My Business locations';
COMMENT ON COLUMN public.gmb_media.external_media_id IS 'Unique identifier from Google My Business API';
COMMENT ON COLUMN public.gmb_media.type IS 'Type of media: PHOTO, VIDEO, etc.';
COMMENT ON COLUMN public.gmb_media.metadata IS 'Full media object from Google API for reference';

