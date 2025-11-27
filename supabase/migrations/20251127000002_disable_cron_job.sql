-- Temporarily disable cron job until function is deployed
-- Created: 2025-11-27
-- Description: Remove cron job to stop 404 errors

-- Remove the cron job
DO $$
BEGIN
  PERFORM cron.unschedule('gmb-sync-worker-every-2min');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- Also remove old job name if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('gmb-sync-queue-worker-every-2min');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

SELECT 'Cron job disabled temporarily' AS result;
