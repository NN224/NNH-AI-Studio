-- PGMQ wrappers, security hardening, and cron job to reflect current DB state
-- Created: 2025-11-26

-- =====================================================
-- 1) Secure pgmq schema
-- =====================================================
REVOKE ALL ON SCHEMA pgmq FROM PUBLIC;
GRANT USAGE ON SCHEMA pgmq TO postgres;
GRANT USAGE ON SCHEMA pgmq TO service_role;

-- =====================================================
-- 2) RPC wrappers for PGMQ (stable signatures)
-- =====================================================
DROP FUNCTION IF EXISTS public.pgmq_read(integer, integer);
CREATE OR REPLACE FUNCTION public.pgmq_read(
  p_qty integer,
  p_vt integer
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.msg_id, r.read_ct, r.enqueued_at, r.vt, r.message
  FROM pgmq.read('gmb_sync_queue', p_vt, p_qty) AS r;
$$;

DROP FUNCTION IF EXISTS public.pgmq_delete(bigint);
CREATE OR REPLACE FUNCTION public.pgmq_delete(p_msg_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pgmq.delete('gmb_sync_queue', p_msg_id);
$$;

DROP FUNCTION IF EXISTS public.pgmq_archive(bigint);
CREATE OR REPLACE FUNCTION public.pgmq_archive(p_msg_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pgmq.archive('gmb_sync_queue', p_msg_id);
$$;

-- Limit execution of wrappers to service_role only
REVOKE ALL ON FUNCTION public.pgmq_read(integer, integer)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pgmq_delete(bigint)           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pgmq_archive(bigint)          FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pgmq_read(integer, integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_delete(bigint)           TO service_role;
GRANT EXECUTE ON FUNCTION public.pgmq_archive(bigint)          TO service_role;

-- =====================================================
-- 3) Metrics wrapper as JSONB (future-proof against column changes)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_queue_metrics();
CREATE OR REPLACE FUNCTION public.get_queue_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb)
  FROM pgmq.metrics('gmb_sync_queue') m;
$$;

-- =====================================================
-- 4) Harden enqueue_sync_job (auth + ownership check) and grant to authenticated
-- =====================================================
CREATE OR REPLACE FUNCTION public.enqueue_sync_job(
  p_account_id UUID,
  p_user_id UUID,
  p_sync_type TEXT DEFAULT 'full',
  p_priority INTEGER DEFAULT 0
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed boolean;
  v_msg_id BIGINT;
BEGIN
  -- Require authenticated user and matching uid
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure account belongs to user and is active
  SELECT EXISTS (
    SELECT 1 FROM public.gmb_accounts
    WHERE id = p_account_id AND user_id = p_user_id AND is_active = true
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Account does not belong to user or not active';
  END IF;

  -- Enqueue to PGMQ
  SELECT pgmq.send(
    queue_name := 'gmb_sync_queue',
    msg := jsonb_build_object(
      'account_id', p_account_id,
      'user_id', p_user_id,
      'sync_type', p_sync_type,
      'priority', p_priority,
      'enqueued_at', NOW()
    ),
    delay := 0
  ) INTO v_msg_id;

  -- Mirror in sync_queue for UI tracking
  INSERT INTO public.sync_queue (
    user_id, account_id, sync_type, status, priority, scheduled_at, metadata
  ) VALUES (
    p_user_id, p_account_id, p_sync_type, 'pending', p_priority, NOW(),
    jsonb_build_object('pgmq_msg_id', v_msg_id, 'enqueued_via', 'pgmq')
  );

  RETURN v_msg_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_sync_job(uuid, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_sync_job(uuid, uuid, text, integer) TO authenticated;

-- =====================================================
DO $outer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gmb-sync-queue-worker-every-2min') THEN
    PERFORM cron.schedule(
      'gmb-sync-queue-worker-every-2min',
      '*/2 * * * *',
      $job$
      SELECT net.http_post(
        url := 'https://rrarhekwhgpgkakqrlyn.supabase.co/functions/v1/gmb-sync-queue-worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Trigger-Secret', '0a943a6fb8321ab8ed21847771488223cfbb058cb4dfd9ccb0df3a8b9c448cd1'
        ),
        body := '{}'::jsonb
      );
      $job$
    );
  END IF;
END$outer$;

SELECT 'PGMQ wrappers, security, and cron synced with DB' AS result;
