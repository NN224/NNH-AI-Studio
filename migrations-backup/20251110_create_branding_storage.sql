-- Migration: Create branding_assets storage bucket
-- Created: 2025-11-10
-- Description: Creates storage bucket for client branding assets (logos, cover images)

DO $$
DECLARE
  bucket CONSTANT TEXT := 'branding_assets';
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES (bucket, bucket, true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies for branding_assets
-- Allow authenticated users to insert their own assets
DO $$
DECLARE
  bucket CONSTANT TEXT := 'branding_assets';
BEGIN
  EXECUTE format(
    $policy$
      CREATE POLICY "Users can upload their own branding assets"
        ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = %L 
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $policy$,
    bucket
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to update their own assets
DO $$
DECLARE
  bucket CONSTANT TEXT := 'branding_assets';
BEGIN
  EXECUTE format(
    $policy$
      CREATE POLICY "Users can update their own branding assets"
        ON storage.objects FOR UPDATE
        USING (
          bucket_id = %L 
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $policy$,
    bucket
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow public SELECT access so images can be displayed
DO $$
DECLARE
  bucket CONSTANT TEXT := 'branding_assets';
BEGIN
  EXECUTE format(
    $policy$
      CREATE POLICY "Public can view branding assets"
        ON storage.objects FOR SELECT
        USING (bucket_id = %L);
    $policy$,
    bucket
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to delete their own assets
DO $$
DECLARE
  bucket CONSTANT TEXT := 'branding_assets';
BEGIN
  EXECUTE format(
    $policy$
      CREATE POLICY "Users can delete their own branding assets"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = %L 
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $policy$,
    bucket
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
