-- Combined migration for Features Tab improvements
-- This includes validation, bulk updates, and change history

-- Create business profile history table for change tracking
CREATE TABLE IF NOT EXISTS public.business_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'bulk_update', 'rollback')),
  data JSONB NOT NULL, -- Stores the complete state or changes
  metadata JSONB, -- Additional metadata (who changed, from where, etc.)
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_history_location ON public.business_profile_history(location_id);
CREATE INDEX IF NOT EXISTS idx_profile_history_created_at ON public.business_profile_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_history_operation ON public.business_profile_history(operation_type);

-- Enable RLS
ALTER TABLE public.business_profile_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own location history" ON public.business_profile_history;
DROP POLICY IF EXISTS "Users can insert history for their locations" ON public.business_profile_history;

-- RLS policies
CREATE POLICY "Users can view their own location history" 
  ON public.business_profile_history 
  FOR SELECT 
  USING (
    location_id IN (
      SELECT id FROM public.gmb_locations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert history for their locations" 
  ON public.business_profile_history 
  FOR INSERT 
  WITH CHECK (
    location_id IN (
      SELECT id FROM public.gmb_locations 
      WHERE user_id = auth.uid()
    )
  );

-- Function to get history with diff
CREATE OR REPLACE FUNCTION get_profile_history_with_diff(p_location_id UUID)
RETURNS TABLE (
  id UUID,
  operation_type TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  changes JSONB,
  previous_values JSONB,
  current_values JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH ordered_history AS (
    SELECT 
      h.*,
      LAG(h.data) OVER (PARTITION BY h.location_id ORDER BY h.created_at) as prev_data
    FROM public.business_profile_history h
    WHERE h.location_id = p_location_id
  )
  SELECT 
    oh.id,
    oh.operation_type,
    oh.created_at,
    oh.created_by,
    CASE 
      WHEN oh.prev_data IS NULL THEN oh.data
      ELSE jsonb_diff(oh.prev_data, oh.data)
    END as changes,
    oh.prev_data as previous_values,
    oh.data as current_values
  FROM ordered_history oh
  ORDER BY oh.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate diff between two JSONB objects
CREATE OR REPLACE FUNCTION jsonb_diff(old_val JSONB, new_val JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  k TEXT;
  v JSONB;
BEGIN
  -- Find keys that exist in new but not in old, or have different values
  FOR k, v IN SELECT * FROM jsonb_each(new_val)
  LOOP
    IF NOT old_val ? k OR old_val->k != v THEN
      result := result || jsonb_build_object(
        k, jsonb_build_object(
          'old', COALESCE(old_val->k, 'null'::jsonb),
          'new', v
        )
      );
    END IF;
  END LOOP;
  
  -- Find keys that exist in old but not in new (deletions)
  FOR k IN SELECT jsonb_object_keys(old_val)
  LOOP
    IF NOT new_val ? k THEN
      result := result || jsonb_build_object(
        k, jsonb_build_object(
          'old', old_val->k,
          'new', 'null'::jsonb,
          'deleted', true
        )
      );
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to rollback to a specific history point
CREATE OR REPLACE FUNCTION rollback_profile_to_history(
  p_history_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_history RECORD;
  v_location_id UUID;
  v_result JSONB;
BEGIN
  -- Get the history record
  SELECT * INTO v_history
  FROM public.business_profile_history
  WHERE id = p_history_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'History record not found');
  END IF;
  
  -- Verify user has access
  IF NOT EXISTS (
    SELECT 1 FROM public.gmb_locations
    WHERE id = v_history.location_id
    AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Create backup of current state before rollback
  INSERT INTO public.business_profile_history (
    location_id,
    location_name,
    operation_type,
    data,
    created_by,
    metadata
  )
  SELECT 
    id,
    location_name,
    'rollback',
    jsonb_build_object(
      'metadata', metadata,
      'business_type', business_type,
      'description', description,
      'phone', phone,
      'website', website,
      'address', address,
      'business_hours', business_hours,
      'attributes', attributes
    ),
    p_user_id,
    jsonb_build_object('rollback_to', p_history_id)
  FROM public.gmb_locations
  WHERE id = v_history.location_id;
  
  -- Apply the historical state
  UPDATE public.gmb_locations
  SET 
    metadata = COALESCE((v_history.data->>'metadata')::jsonb, metadata),
    business_type = COALESCE(v_history.data->>'business_type', business_type),
    description = COALESCE(v_history.data->>'description', description),
    phone = COALESCE(v_history.data->>'phone', phone),
    website = COALESCE(v_history.data->>'website', website),
    address = COALESCE((v_history.data->>'address')::jsonb, address),
    business_hours = COALESCE((v_history.data->>'business_hours')::jsonb, business_hours),
    attributes = COALESCE((v_history.data->>'attributes')::jsonb, attributes),
    updated_at = NOW()
  WHERE id = v_history.location_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Profile rolled back successfully',
    'history_id', p_history_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.business_profile_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_history_with_diff TO authenticated;
GRANT EXECUTE ON FUNCTION jsonb_diff TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_profile_to_history TO authenticated;

-- Create trigger to automatically record changes
CREATE OR REPLACE FUNCTION record_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if there are actual changes
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO public.business_profile_history (
      location_id,
      location_name,
      operation_type,
      data,
      metadata,
      created_by
    ) VALUES (
      NEW.id,
      NEW.location_name,
      'update',
      jsonb_build_object(
        'metadata', NEW.metadata,
        'business_type', NEW.business_type,
        'description', NEW.description,
        'phone', NEW.phone,
        'website', NEW.website,
        'address', NEW.address,
        'business_hours', NEW.business_hours,
        'attributes', NEW.attributes
      ),
      jsonb_build_object(
        'automatic', true,
        'trigger', 'record_profile_changes'
      ),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS gmb_locations_history_trigger ON public.gmb_locations;
CREATE TRIGGER gmb_locations_history_trigger
  AFTER UPDATE ON public.gmb_locations
  FOR EACH ROW
  EXECUTE FUNCTION record_profile_changes();
