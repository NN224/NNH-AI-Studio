-- Setup Supabase pg_cron for GMB Auto-Sync
-- Run this in Supabase SQL Editor

-- Step 1: Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Enable pg_net extension (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 3: Create a function to call the Edge Function
-- Replace YOUR_PROJECT_REF with your Supabase project reference
-- Replace YOUR_CRON_SECRET with your actual secret
CREATE OR REPLACE FUNCTION trigger_gmb_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref TEXT := 'YOUR_PROJECT_REF';  -- Replace with your project ref
  cron_secret TEXT := 'YOUR_CRON_SECRET';   -- Replace with your secret
  edge_function_url TEXT;
BEGIN
  -- Build the Edge Function URL
  edge_function_url := 'https://' || project_ref || '.supabase.co/functions/v1/scheduled-sync';
  
  -- Make HTTP POST request to Edge Function
  PERFORM
    net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || cron_secret,
        'Content-Type', 'application/json'
      )
    ) AS request_id;
    
  RAISE NOTICE 'GMB sync triggered via Edge Function';
END;
$$;

-- Step 4: Schedule hourly sync (every hour at minute 0)
SELECT cron.schedule(
  'gmb-sync-hourly',
  '0 * * * *',  -- Every hour
  $$
  SELECT trigger_gmb_sync();
  $$
);

-- Step 5: Schedule daily sync (midnight UTC)
SELECT cron.schedule(
  'gmb-sync-daily',
  '0 0 * * *',  -- Every day at midnight
  $$
  SELECT trigger_gmb_sync();
  $$
);

-- Step 6: Schedule twice-daily sync (9 AM and 6 PM UTC)
SELECT cron.schedule(
  'gmb-sync-9am',
  '0 9 * * *',  -- Every day at 9 AM
  $$
  SELECT trigger_gmb_sync();
  $$
);

SELECT cron.schedule(
  'gmb-sync-6pm',
  '0 18 * * *',  -- Every day at 6 PM
  $$
  SELECT trigger_gmb_sync();
  $$
);

-- Step 7: Schedule weekly sync (Monday at midnight)
SELECT cron.schedule(
  'gmb-sync-weekly',
  '0 0 * * 1',  -- Every Monday at midnight
  $$
  SELECT trigger_gmb_sync();
  $$
);

-- View all scheduled jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('gmb-sync-hourly');

-- To update a job, unschedule and reschedule:
-- SELECT cron.unschedule('gmb-sync-hourly');
-- SELECT cron.schedule('gmb-sync-hourly', '0 * * * *', $$SELECT trigger_gmb_sync();$$);

