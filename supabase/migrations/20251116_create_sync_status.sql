-- Create sync_status table used by GMB Sync API (idempotent)
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.gmb_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed','cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  meta JSONB DEFAULT '{}'::jsonb
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_sync_status_user ON public.sync_status(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status_account ON public.sync_status(account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON public.sync_status(status);

-- Enable RLS and basic policies
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sync_status' AND policyname = 'Users can manage their sync status'
  ) THEN
    CREATE POLICY "Users can manage their sync status"
      ON public.sync_status
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON TABLE public.sync_status IS 'Tracks GMB sync runs (status, progress, timings) for each user/account';
COMMENT ON COLUMN public.sync_status.meta IS 'Optional JSON with section counts, errors, or diagnostics';


