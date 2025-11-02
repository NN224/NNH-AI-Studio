-- ========================================
-- سكريبتات SQL المطلوبة لتشغيلها في SQL Editor
-- تاريخ: 2 فبراير 2025
-- ========================================
-- 
-- اتبع الخطوات بالترتيب:
-- 1. افتح Supabase Dashboard
-- 2. اذهب إلى SQL Editor
-- 3. شغل كل سكريبت على حدة (من السطر 1 إلى السطر الأخير لكل سكريبت)
-- 4. تأكد من نجاح كل سكريبت قبل الانتقال للتالي
--
-- ========================================

-- ========================================
-- السكريبت 1: إصلاح Foreign Key في oauth_states
-- ========================================
-- هذا السكريبت يغير Foreign Key من profiles(id) إلى auth.users(id)
-- هذا ضروري لأن الكود يستخدم auth.uid() الذي يعيد auth.users(id)

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
-- السكريبت 2: إنشاء جدول gmb_media
-- ========================================
-- هذا السكريبت ينشئ جدول لحفظ Media items من Google My Business

-- التحقق من وجود الجداول المطلوبة أولاً
DO $$
BEGIN
  -- التحقق من وجود gmb_accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_accounts') THEN
    RAISE EXCEPTION 'Table gmb_accounts does not exist. Please create it first using scripts/001_create_gmb_schema.sql';
  END IF;
  
  -- التحقق من وجود gmb_locations
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_locations') THEN
    RAISE EXCEPTION 'Table gmb_locations does not exist. Please create it first using scripts/001_create_gmb_schema.sql';
  END IF;
  
  RAISE NOTICE 'All required tables exist. Proceeding with gmb_media creation...';
END $$;

-- إذا كان الجدول موجوداً بالفعل بدون الأعمدة الصحيحة، احذفه وأعد إنشاءه
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gmb_media') THEN
    -- التحقق من وجود العمود gmb_account_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gmb_media' 
      AND column_name = 'gmb_account_id'
    ) THEN
      RAISE NOTICE 'Table gmb_media exists but missing gmb_account_id. Dropping and recreating...';
      DROP TABLE IF EXISTS public.gmb_media CASCADE;
    ELSE
      RAISE NOTICE 'Table gmb_media already exists with correct structure. Skipping creation.';
    END IF;
  END IF;
END $$;

-- إنشاء الجدول بدون Foreign Keys أولاً
CREATE TABLE IF NOT EXISTS public.gmb_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmb_account_id UUID NOT NULL,
  location_id UUID NOT NULL,
  user_id UUID NOT NULL,
  external_media_id TEXT NOT NULL, -- e.g., "accounts/123/locations/456/media/789"
  type TEXT, -- e.g., "PHOTO", "VIDEO"
  url TEXT, -- Google URL for the media
  thumbnail_url TEXT, -- Thumbnail URL if available
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- Store full media object from API
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة Foreign Keys بعد إنشاء الجدول
DO $$
BEGIN
  -- إضافة Foreign Key لـ gmb_accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gmb_media_gmb_account_id_fkey'
  ) THEN
    ALTER TABLE public.gmb_media
    ADD CONSTRAINT gmb_media_gmb_account_id_fkey 
    FOREIGN KEY (gmb_account_id) REFERENCES public.gmb_accounts(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key to gmb_accounts';
  END IF;
  
  -- إضافة Foreign Key لـ gmb_locations
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gmb_media_location_id_fkey'
  ) THEN
    ALTER TABLE public.gmb_media
    ADD CONSTRAINT gmb_media_location_id_fkey 
    FOREIGN KEY (location_id) REFERENCES public.gmb_locations(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key to gmb_locations';
  END IF;
  
  -- إضافة Foreign Key لـ auth.users
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gmb_media_user_id_fkey'
  ) THEN
    ALTER TABLE public.gmb_media
    ADD CONSTRAINT gmb_media_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key to auth.users';
  END IF;
END $$;

-- إنشاء Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_gmb_media_account ON public.gmb_media(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_location ON public.gmb_media(location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_user ON public.gmb_media(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_media_external_id ON public.gmb_media(external_media_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gmb_media_unique ON public.gmb_media(external_media_id, location_id);

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
-- هذا السكريبت يحذف OAuth states المنتهية الصلاحية (أكثر من 24 ساعة)
-- يمكنك تشغيله بشكل دوري أو تلقائي

DELETE FROM public.oauth_states 
WHERE expires_at < NOW() - INTERVAL '24 hours'
  OR (used = true AND created_at < NOW() - INTERVAL '7 days');

-- إحصائيات بعد التنظيف
SELECT 
  COUNT(*) as total_states,
  COUNT(*) FILTER (WHERE used = false) as unused_states,
  COUNT(*) FILTER (WHERE used = true) as used_states,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_states
FROM public.oauth_states;

-- ========================================
-- ✅ اكتمل السكريبت 3 (اختياري)
-- ========================================

-- ========================================
-- التحقق من النتائج
-- ========================================
-- بعد تشغيل السكريبتات، شغل هذا للتحقق:

-- 1. التحقق من oauth_states Foreign Key
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.oauth_states'::regclass
  AND conname = 'oauth_states_user_id_fkey';

-- 2. التحقق من جدول gmb_media
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'gmb_media'
ORDER BY ordinal_position;

-- 3. التحقق من Indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'gmb_media';

-- 4. التحقق من RLS Policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('oauth_states', 'gmb_media')
ORDER BY tablename, policyname;

-- ========================================
-- ✅ انتهى
-- ========================================

