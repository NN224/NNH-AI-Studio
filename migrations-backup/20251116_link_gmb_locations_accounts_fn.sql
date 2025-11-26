-- Function to link gmb_locations to gmb_accounts for a specific user
CREATE OR REPLACE FUNCTION public.link_gmb_locations_accounts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Fill account_id for locations where it's null using local account PK
  UPDATE public.gmb_locations l
  SET account_id = a.id
  FROM public.gmb_accounts a
  WHERE l.gmb_account_id = a.id
    AND (l.account_id IS NULL OR l.account_id <> a.id)
    AND a.user_id = p_user_id;

  -- Ensure user_id is set correctly
  UPDATE public.gmb_locations l
  SET user_id = a.user_id
  FROM public.gmb_accounts a
  WHERE l.gmb_account_id = a.id
    AND (l.user_id IS NULL OR l.user_id <> a.user_id)
    AND a.user_id = p_user_id;

  -- Ensure is_active true for linked locations
  UPDATE public.gmb_locations l
  SET is_active = TRUE
  FROM public.gmb_accounts a
  WHERE l.gmb_account_id = a.id
    AND a.user_id = p_user_id
    AND l.is_active IS DISTINCT FROM TRUE;
END;
$$;


