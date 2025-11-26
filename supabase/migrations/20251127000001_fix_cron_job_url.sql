-- Fix cron job URL to use correct function name
-- Created: 2025-11-27
-- Description: Remove old cron job with wrong URL and create new one

-- Remove old job if exists (ignore error if not found)
DO $$
BEGIN
  PERFORM cron.unschedule('gmb-sync-queue-worker-every-2min');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

-- Create new job with correct URL
SELECT cron.schedule(
  'gmb-sync-worker-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/gmb-sync-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT 'Cron job URL fixed' AS result;
