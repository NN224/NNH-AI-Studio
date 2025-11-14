-- Migration: Add missing columns to gmb_locations table
-- Created: 2025-02-17
-- Description: Adds 21 missing columns to gmb_locations table that exist in production DB but don't have migrations
-- These columns are used by the application code (sync route, Business Profile API, etc.)

-- ============================================
-- Critical columns (used in application code)
-- ============================================

-- Description fields
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Categories
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS additional_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS from_the_business TEXT[] DEFAULT ARRAY[]::TEXT[];

-- URLs
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS menu_url TEXT,
ADD COLUMN IF NOT EXISTS booking_url TEXT,
ADD COLUMN IF NOT EXISTS order_url TEXT,
ADD COLUMN IF NOT EXISTS appointment_url TEXT;

-- Profile information
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS opening_date DATE,
ADD COLUMN IF NOT EXISTS service_area_enabled BOOLEAN,
ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

-- ============================================
-- Other columns (exist in DB but less critical)
-- ============================================

-- Account and location identifiers
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS account_id TEXT,
ADD COLUMN IF NOT EXISTS location_id_external TEXT;

-- Business information
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS business_hours JSONB,
ADD COLUMN IF NOT EXISTS regularhours JSONB,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS type TEXT;

-- Metrics and tracking
ALTER TABLE public.gmb_locations
ADD COLUMN IF NOT EXISTS health_score INTEGER,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS latlng TEXT;

-- ============================================
-- Indexes for performance
-- ============================================

-- Index for description search (if needed in future)
CREATE INDEX IF NOT EXISTS idx_gmb_locations_description 
  ON public.gmb_locations USING gin(to_tsvector('english', COALESCE(description, '')));

-- Index for additional_categories array search
CREATE INDEX IF NOT EXISTS idx_gmb_locations_additional_categories 
  ON public.gmb_locations USING gin(additional_categories);

-- Index for profile completeness queries
CREATE INDEX IF NOT EXISTS idx_gmb_locations_profile_completeness 
  ON public.gmb_locations(profile_completeness) 
  WHERE profile_completeness IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_gmb_locations_status 
  ON public.gmb_locations(status) 
  WHERE status IS NOT NULL;

-- Index for last_synced_at for sync tracking
CREATE INDEX IF NOT EXISTS idx_gmb_locations_last_synced_at 
  ON public.gmb_locations(last_synced_at DESC) 
  WHERE last_synced_at IS NOT NULL;

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON COLUMN public.gmb_locations.description IS 'Business description/profile description from Google My Business';
COMMENT ON COLUMN public.gmb_locations.short_description IS 'Short business description';
COMMENT ON COLUMN public.gmb_locations.additional_categories IS 'Additional business categories (array of category names)';
COMMENT ON COLUMN public.gmb_locations.from_the_business IS 'Information from the business (array of text)';
COMMENT ON COLUMN public.gmb_locations.cover_photo_url IS 'URL to the cover photo for the business profile';
COMMENT ON COLUMN public.gmb_locations.menu_url IS 'URL to the business menu';
COMMENT ON COLUMN public.gmb_locations.booking_url IS 'URL for booking/reservations';
COMMENT ON COLUMN public.gmb_locations.order_url IS 'URL for online ordering';
COMMENT ON COLUMN public.gmb_locations.appointment_url IS 'URL for appointments';
COMMENT ON COLUMN public.gmb_locations.opening_date IS 'Date when the business opened';
COMMENT ON COLUMN public.gmb_locations.service_area_enabled IS 'Whether service area is enabled for this location';
COMMENT ON COLUMN public.gmb_locations.profile_completeness IS 'Profile completeness score (0-100)';
COMMENT ON COLUMN public.gmb_locations.account_id IS 'Account identifier (legacy/alternative)';
COMMENT ON COLUMN public.gmb_locations.location_id_external IS 'External location identifier';
COMMENT ON COLUMN public.gmb_locations.business_hours IS 'Business hours in JSONB format';
COMMENT ON COLUMN public.gmb_locations.regularhours IS 'Regular business hours in JSONB format';
COMMENT ON COLUMN public.gmb_locations.status IS 'Location status (verified, pending, suspended, etc.)';
COMMENT ON COLUMN public.gmb_locations.type IS 'Location type';
COMMENT ON COLUMN public.gmb_locations.health_score IS 'Health score for the location';
COMMENT ON COLUMN public.gmb_locations.last_synced_at IS 'Last synchronization timestamp';
COMMENT ON COLUMN public.gmb_locations.latlng IS 'Latitude/longitude as text (alternative format)';

