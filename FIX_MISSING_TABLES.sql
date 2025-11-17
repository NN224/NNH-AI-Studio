-- ========================================
-- 🔧 FIX MISSING TABLES
-- ========================================

-- 1️⃣ فحص الـ tables الموجودة
-- ========================================
SELECT 
  '1. Existing Tables' as check_name,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%auto_reply%' OR table_name LIKE '%ai_settings%'
ORDER BY table_name;

-- 2️⃣ إنشاء auto_reply_settings table (إذا لم يكن موجود)
-- ========================================
CREATE TABLE IF NOT EXISTS public.auto_reply_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  min_rating INTEGER DEFAULT 1 CHECK (min_rating BETWEEN 1 AND 5),
  max_rating INTEGER DEFAULT 5 CHECK (max_rating BETWEEN 1 AND 5),
  reply_template TEXT,
  use_ai BOOLEAN DEFAULT true,
  ai_tone TEXT DEFAULT 'professional' CHECK (ai_tone IN ('professional', 'friendly', 'casual', 'formal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_user_id 
  ON public.auto_reply_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_location_id 
  ON public.auto_reply_settings(location_id);

-- RLS
ALTER TABLE public.auto_reply_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'auto_reply_settings' 
    AND policyname = 'Users can manage their auto reply settings'
  ) THEN
    CREATE POLICY "Users can manage their auto reply settings"
      ON public.auto_reply_settings
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3️⃣ التحقق من إنشاء الـ table
-- ========================================
SELECT 
  '3. auto_reply_settings Created' as check_name,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'auto_reply_settings') as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'auto_reply_settings';

