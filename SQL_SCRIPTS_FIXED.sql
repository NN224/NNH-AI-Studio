-- ========================================
-- سكريبتات SQL المصلحة - بدون أخطاء
-- تاريخ: 2 فبراير 2025
-- ========================================
-- 
-- هذا الملف يحتوي على سكريبتات مصححة بدون مشاكل Foreign Key
-- استخدم هذا الملف بدلاً من SQL_SCRIPTS_TO_RUN.sql إذا واجهت أخطاء
--
-- ========================================

-- ========================================
-- السكريبت 1: إصلاح Foreign Key في oauth_states
-- ========================================

-- Step 1: حذف Foreign Key constraint الموجود
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'oauth_states_user_id_fkey'
  ) THEN
    ALTER TABLE public.oauth_states 
    DROP CONSTRAINT oauth_states_user_id_fkey;
    RAISE NOTICE 'Dropped existing oauth_states_user_id_fkey constraint';
  ELSE
    RAISE NOTICE 'oauth_states_user_id_fkey constraint does not exist';
  END IF;
END $$;

-- Step 2: إضافة Foreign Key constraint جديد يشير إلى auth.users
ALTER TABLE public.oauth_states
ADD CONSTRAINT oauth_states_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: حذف RLS policies القديمة
DROP POLICY IF EXISTS "Users can view their own oauth states" ON public.oauth_states;
DROP POLICY IF EXISTS "Users can insert their own oauth states" ON public.oauth_states;
DROP POLICY IF EXISTS "Users can update their own oauth states" ON public.oauth_states;
DROP POLICY IF EXISTS "Users can delete their own oauth states" ON public.oauth_states;

-- Step 4: إعادة إنشاء RLS policies مع auth.uid()
CREATE POLICY "Users can view their own oauth states"
  ON public.oauth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own oauth states"
  ON public.oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own oauth states"
  ON public.oauth_states FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oauth states"
  ON public.oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- إضافة تعليق
COMMENT ON CONSTRAINT oauth_states_user_id_fkey ON public.oauth_states 
IS 'Foreign key to auth.users(id) - matches user.id from supabase.auth.getUser()';

-- ========================================
-- ✅ اكتمل السكريبت 1
-- ========================================

-- ========================================
-- السكريبت 2: إنشاء جدول gmb_media (مصحح)
-- ========================================

-- التحقق من وجود الجداول المطلوبة
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_accounts') THEN
    RAISE EXCEPTION 'Table gmb_accounts does not exist. Please create it first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_locations') THEN
    RAISE EXCEPTION 'Table gmb_locations does not exist. Please create it first.';
  END IF;
END $$;

-- حذف الجدول إذا كان موجوداً بشكل خاطئ
DROP TABLE IF EXISTS public.gmb_media CASCADE;

-- إنشاء الجدول بدون Foreign Keys في التعريف (سنتضيفها بعد ذلك)
CREATE TABLE public.gmb_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID NOT NULL,
  location_id UUID NOT NULL,
  user_id UUID NOT NULL,
  external_media_id TEXT NOT NULL,
  type TEXT,
  url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة Foreign Keys بشكل منفصل
ALTER TABLE public.gmb_media
ADD CONSTRAINT gmb_media_gmb_account_id_fkey 
FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.gmb_media
ADD CONSTRAINT gmb_media_location_id_fkey 
FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE;

ALTER TABLE public.gmb_media
ADD CONSTRAINT gmb_media_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- إنشاء Indexes
CREATE INDEX idx_gmb_media_account ON public.gmb_media(gmb_account_id);
CREATE INDEX idx_gmb_media_location ON public.gmb_media(location_id);
CREATE INDEX idx_gmb_media_user ON public.gmb_media(user_id);
CREATE INDEX idx_gmb_media_external_id ON public.gmb_media(external_media_id);
CREATE UNIQUE INDEX idx_gmb_media_unique ON public.gmb_media(external_media_id, location_id);

-- تفعيل Row Level Security
ALTER TABLE public.gmb_media ENABLE ROW LEVEL SECURITY;

-- إنشاء RLS Policies
CREATE POLICY "Users can view their own media"
  ON public.gmb_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media"
  ON public.gmb_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media"
  ON public.gmb_media FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON public.gmb_media FOR DELETE
  USING (auth.uid() = user_id);

-- إضافة تعليقات
COMMENT ON TABLE public.gmb_media IS 'Stores media items (photos/videos) from Google My Business locations';
COMMENT ON COLUMN public.gmb_media.external_media_id IS 'Unique identifier from Google My Business API';
COMMENT ON COLUMN public.gmb_media.type IS 'Type of media: PHOTO, VIDEO, etc.';
COMMENT ON COLUMN public.gmb_media.metadata IS 'Full media object from Google API for reference';

-- ========================================
-- ✅ اكتمل السكريبت 2
-- ========================================

-- ========================================
-- السكريبت 3 (اختياري): تنظيف oauth_states القديمة
-- ========================================

DELETE FROM public.oauth_states 
WHERE expires_at < NOW() - INTERVAL '24 hours'
  OR (used = true AND created_at < NOW() - INTERVAL '7 days');

-- ========================================
-- ✅ انتهى
-- ========================================

