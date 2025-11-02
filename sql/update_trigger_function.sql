-- تحديث Function trigger_gmb_sync() بالقيم الصحيحة
-- ⚠️ استبدل YOUR_CRON_SECRET بالقيمة الفعلية من Supabase Secrets

CREATE OR REPLACE FUNCTION trigger_gmb_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref TEXT := 'rrarhekwhgpgkakqrlyn';  -- ✅ PROJECT_REF الخاص بك
  cron_secret TEXT := 'YOUR_CRON_SECRET';       -- ⚠️ استبدل بـ CRON_SECRET من Supabase Secrets
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
    
  RAISE NOTICE 'GMB sync triggered via Edge Function: %', edge_function_url;
END;
$$;

-- اختبر Function يدوياً (اختياري)
-- SELECT trigger_gmb_sync();

