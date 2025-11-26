-- Migration: Create gmb_attributes table for storing location attributes
-- Created: 2025-02-03
-- Description: Creates table to store Google My Business location attributes

-- Create gmb_attributes table
CREATE TABLE IF NOT EXISTS public.gmb_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Attribute details
  attribute_name TEXT NOT NULL, -- e.g., "attributes/has_wheelchair_accessible_entrance"
  attribute_value JSONB NOT NULL, -- Store values as JSON array
  value_type TEXT, -- e.g., "BOOL", "ENUM", "URL", "REPEATED_ENUM"
  display_name TEXT, -- Human-readable name
  group_name TEXT, -- Category/group of the attribute
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_deprecated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one attribute per location
  UNIQUE(location_id, attribute_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_account 
  ON public.gmb_attributes(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_location 
  ON public.gmb_attributes(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_user 
  ON public.gmb_attributes(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_name 
  ON public.gmb_attributes(attribute_name);
CREATE INDEX IF NOT EXISTS idx_gmb_attributes_active 
  ON public.gmb_attributes(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.gmb_attributes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmb_attributes
CREATE POLICY "Users can view their own attributes"
  ON public.gmb_attributes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attributes"
  ON public.gmb_attributes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attributes"
  ON public.gmb_attributes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attributes"
  ON public.gmb_attributes FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.gmb_attributes IS 'Stores Google My Business location attributes and their values';
COMMENT ON COLUMN public.gmb_attributes.attribute_name IS 'Full attribute name from GMB API (e.g., attributes/has_wheelchair_accessible_entrance)';
COMMENT ON COLUMN public.gmb_attributes.attribute_value IS 'JSON array of attribute values';
COMMENT ON COLUMN public.gmb_attributes.value_type IS 'Type of attribute value (BOOL, ENUM, URL, REPEATED_ENUM)';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gmb_attributes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gmb_attributes_updated_at ON public.gmb_attributes;

CREATE TRIGGER trigger_update_gmb_attributes_updated_at
BEFORE UPDATE ON public.gmb_attributes
FOR EACH ROW
EXECUTE FUNCTION public.update_gmb_attributes_updated_at();
