-- Migration: Create gmb_services table for Google My Business services
-- Purpose: Store business services/products offered at GMB locations
-- Created: 2025-11-28
-- Author: Production Readiness Audit

BEGIN;

-- ==================== TABLE CREATION ====================

CREATE TABLE IF NOT EXISTS gmb_services (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES gmb_locations(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,

  -- Service details
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  category TEXT CHECK (length(trim(category)) > 0),
  description TEXT,

  -- Pricing information
  price NUMERIC(10, 2) CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (
    price_type IN ('fixed', 'range', 'starting_at', 'free', 'unknown')
  ),

  -- Service attributes
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  is_active BOOLEAN DEFAULT true,

  -- External sync data
  external_service_id TEXT UNIQUE,
  synced_at TIMESTAMPTZ,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================

-- Performance indexes for common queries
CREATE INDEX idx_gmb_services_user_id
  ON gmb_services(user_id)
  WHERE is_active = true;

CREATE INDEX idx_gmb_services_location_id
  ON gmb_services(location_id)
  WHERE is_active = true;

CREATE INDEX idx_gmb_services_account_id
  ON gmb_services(gmb_account_id)
  WHERE gmb_account_id IS NOT NULL;

CREATE INDEX idx_gmb_services_category
  ON gmb_services(category)
  WHERE category IS NOT NULL AND is_active = true;

CREATE INDEX idx_gmb_services_external_id
  ON gmb_services(external_service_id)
  WHERE external_service_id IS NOT NULL;

-- GIN index for JSONB metadata queries
CREATE INDEX idx_gmb_services_metadata
  ON gmb_services USING gin(metadata);

-- Composite index for common query patterns
CREATE INDEX idx_gmb_services_user_location_active
  ON gmb_services(user_id, location_id, is_active);

-- ==================== TRIGGERS ====================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_updated_at_gmb_services
  BEFORE UPDATE ON gmb_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE gmb_services ENABLE ROW LEVEL SECURITY;

-- Users can view their own services
CREATE POLICY "Users can view own services"
  ON gmb_services
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own services
CREATE POLICY "Users can insert own services"
  ON gmb_services
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own services
CREATE POLICY "Users can update own services"
  ON gmb_services
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own services
CREATE POLICY "Users can delete own services"
  ON gmb_services
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access for admin operations
CREATE POLICY "Service role has full access to services"
  ON gmb_services
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== COMMENTS ====================

COMMENT ON TABLE gmb_services IS
  'Stores business services and products offered at GMB locations. Used for AI-powered post generation and service management features.';

COMMENT ON COLUMN gmb_services.id IS
  'Unique identifier for the service';

COMMENT ON COLUMN gmb_services.user_id IS
  'Owner of the service (foreign key to auth.users)';

COMMENT ON COLUMN gmb_services.location_id IS
  'GMB location where service is offered (foreign key to gmb_locations)';

COMMENT ON COLUMN gmb_services.gmb_account_id IS
  'GMB account associated with this service (foreign key to gmb_accounts)';

COMMENT ON COLUMN gmb_services.name IS
  'Service name (e.g., "Oil Change", "House Cleaning")';

COMMENT ON COLUMN gmb_services.category IS
  'Service category for grouping (e.g., "Automotive", "Home Services")';

COMMENT ON COLUMN gmb_services.description IS
  'Detailed description of the service';

COMMENT ON COLUMN gmb_services.price IS
  'Service price (numeric for precise calculations)';

COMMENT ON COLUMN gmb_services.currency IS
  'ISO 4217 currency code (e.g., "USD", "EUR", "AED")';

COMMENT ON COLUMN gmb_services.price_type IS
  'Pricing model: fixed (exact price), range (min-max), starting_at (from X), free, or unknown';

COMMENT ON COLUMN gmb_services.duration_minutes IS
  'Estimated service duration in minutes';

COMMENT ON COLUMN gmb_services.is_active IS
  'Whether service is currently offered (soft delete)';

COMMENT ON COLUMN gmb_services.external_service_id IS
  'External ID from GMB API if synced from Google';

COMMENT ON COLUMN gmb_services.synced_at IS
  'Last sync timestamp from GMB API';

COMMENT ON COLUMN gmb_services.metadata IS
  'Additional service data in JSONB format for extensibility';

COMMENT ON COLUMN gmb_services.created_at IS
  'Timestamp when service was created';

COMMENT ON COLUMN gmb_services.updated_at IS
  'Timestamp when service was last modified (auto-updated by trigger)';

COMMIT;
