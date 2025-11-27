-- Fix helper functions to match the new sync_status table schema

CREATE OR REPLACE FUNCTION update_sync_status_success(
  p_account_id UUID,
  p_sync_type TEXT,
  p_completed_at TIMESTAMPTZ
)
RETURNS void AS $$
BEGIN
  -- Update the sync_status table (using 'status' column, NOT 'last_sync_status')
  UPDATE sync_status
  SET
    status = 'completed',
    stage = 'complete',
    progress = 100,
    message = 'Sync completed successfully',
    updated_at = NOW()
  WHERE account_id = p_account_id;

  -- Also update the account table
  UPDATE gmb_accounts
  SET
    last_synced_at = p_completed_at,
    last_error = NULL
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_sync_status_failure(
  p_account_id UUID,
  p_error TEXT,
  p_completed_at TIMESTAMPTZ
)
RETURNS void AS $$
BEGIN
  UPDATE sync_status
  SET
    status = 'error',
    message = p_error,
    error = p_error,
    updated_at = NOW()
  WHERE account_id = p_account_id;

  -- Also update the account table
  UPDATE gmb_accounts
  SET
    last_error = p_error
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;