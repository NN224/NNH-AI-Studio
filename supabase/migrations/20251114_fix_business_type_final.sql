-- FINAL FIX: Remove all business_type references from functions and triggers
-- This ensures no errors when upserting locations or reviews

-- 1. Fix record_profile_changes function
CREATE OR REPLACE FUNCTION record_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only work on gmb_locations table
  IF TG_TABLE_NAME != 'gmb_locations' THEN
    RETURN NEW;
  END IF;
  
  -- Only record if there are actual changes (and OLD exists for UPDATE)
  IF TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW THEN
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

-- 2. Fix rollback_profile_to_history function
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

-- 3. Ensure trigger is only on gmb_locations (AFTER UPDATE only)
DROP TRIGGER IF EXISTS gmb_locations_history_trigger ON public.gmb_locations;
CREATE TRIGGER gmb_locations_history_trigger
  AFTER UPDATE ON public.gmb_locations
  FOR EACH ROW
  EXECUTE FUNCTION record_profile_changes();

-- 4. Make sure this trigger is NOT on gmb_reviews
DROP TRIGGER IF EXISTS gmb_locations_history_trigger ON public.gmb_reviews;
DROP TRIGGER IF EXISTS gmb_reviews_history_trigger ON public.gmb_reviews;
DROP TRIGGER IF EXISTS record_profile_changes_trigger ON public.gmb_reviews;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION record_profile_changes TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_profile_to_history TO authenticated;

