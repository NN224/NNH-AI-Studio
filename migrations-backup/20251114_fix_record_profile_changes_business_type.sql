-- Fix record_profile_changes function to handle missing business_type column

CREATE OR REPLACE FUNCTION record_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only work on gmb_locations table
  IF TG_TABLE_NAME != 'gmb_locations' THEN
    RETURN NEW;
  END IF;
  
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

-- Ensure trigger is only on gmb_locations (not on gmb_reviews)
DROP TRIGGER IF EXISTS gmb_locations_history_trigger ON public.gmb_locations;
CREATE TRIGGER gmb_locations_history_trigger
  AFTER UPDATE ON public.gmb_locations
  FOR EACH ROW
  EXECUTE FUNCTION record_profile_changes();

-- Make sure this trigger is NOT on gmb_reviews
DROP TRIGGER IF EXISTS gmb_locations_history_trigger ON public.gmb_reviews;
DROP TRIGGER IF EXISTS gmb_reviews_history_trigger ON public.gmb_reviews;
DROP TRIGGER IF EXISTS record_profile_changes_trigger ON public.gmb_reviews;

