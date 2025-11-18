# 🔧 إصلاح مشكلة Auto-Pilot

## ❌ **المشكلة:**

صفحة Auto-Pilot تعطي خطأ:
```
فشل تحميل الإعدادات
```

**السبب:** جدول `auto_reply_settings` غير موجود في Supabase!

---

## ✅ **الحل:**

### **⚠️ إذا الجدول موجود (Column Error):**

إذا طلع خطأ:
```
ERROR: column "response_style" does not exist
```

يعني الجدول موجود بس ناقص أعمدة. شغّل هذا الكود بدلاً:

```sql
-- Fix Missing Columns
DO $$ 
BEGIN
  -- Add response_style
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' AND column_name = 'response_style'
  ) THEN
    ALTER TABLE auto_reply_settings ADD COLUMN response_style TEXT DEFAULT 'friendly';
    ALTER TABLE auto_reply_settings ADD CONSTRAINT valid_response_style 
      CHECK (response_style IN ('friendly', 'professional', 'apologetic', 'marketing'));
  END IF;

  -- Add response_delay_minutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' AND column_name = 'response_delay_minutes'
  ) THEN
    ALTER TABLE auto_reply_settings ADD COLUMN response_delay_minutes INTEGER DEFAULT 0;
  END IF;

  -- Add reply_to_positive
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' AND column_name = 'reply_to_positive'
  ) THEN
    ALTER TABLE auto_reply_settings ADD COLUMN reply_to_positive BOOLEAN DEFAULT true;
  END IF;

  -- Add reply_to_neutral
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' AND column_name = 'reply_to_neutral'
  ) THEN
    ALTER TABLE auto_reply_settings ADD COLUMN reply_to_neutral BOOLEAN DEFAULT false;
  END IF;

  -- Add reply_to_negative
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' AND column_name = 'reply_to_negative'
  ) THEN
    ALTER TABLE auto_reply_settings ADD COLUMN reply_to_negative BOOLEAN DEFAULT false;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auto_reply_settings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE auto_reply_settings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create trigger
CREATE OR REPLACE FUNCTION update_auto_reply_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_reply_settings_updated_at ON auto_reply_settings;
CREATE TRIGGER auto_reply_settings_updated_at
  BEFORE UPDATE ON auto_reply_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_reply_settings_updated_at();
```

**ثم شغّل Enhancement Migration:**

```sql
-- Add per-rating columns
ALTER TABLE auto_reply_settings
  ADD COLUMN IF NOT EXISTS auto_reply_1_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_2_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_3_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_4_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_5_star BOOLEAN DEFAULT true;
```

---

### **الخطوة 1: إذا الجدول مش موجود (Table Not Found):**

افتح **Supabase Dashboard** → **SQL Editor** وشغّل هذا الكود:

```sql
-- Migration: Create Auto-Reply Settings Table
-- Created: 2025-01-15

CREATE TABLE IF NOT EXISTS auto_reply_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES gmb_locations(id) ON DELETE CASCADE,
  
  -- Core settings
  enabled BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT false,
  response_style TEXT DEFAULT 'friendly',
  response_delay_minutes INTEGER DEFAULT 0,
  
  -- Legacy per-sentiment controls
  reply_to_positive BOOLEAN DEFAULT true,
  reply_to_neutral BOOLEAN DEFAULT false,
  reply_to_negative BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_location UNIQUE (user_id, location_id),
  CONSTRAINT valid_response_style CHECK (response_style IN ('friendly', 'professional', 'apologetic', 'marketing'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_user 
  ON auto_reply_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_location 
  ON auto_reply_settings(location_id);

CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_enabled 
  ON auto_reply_settings(enabled) 
  WHERE enabled = true;

-- Enable RLS
ALTER TABLE auto_reply_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own auto-reply settings"
  ON auto_reply_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own auto-reply settings"
  ON auto_reply_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auto-reply settings"
  ON auto_reply_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own auto-reply settings"
  ON auto_reply_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_auto_reply_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_reply_settings_updated_at
  BEFORE UPDATE ON auto_reply_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_reply_settings_updated_at();
```

### **الخطوة 2: تطبيق Enhancement Migration**

بعد الخطوة 1، شغّل هذا:

```sql
-- Add per-rating control columns
ALTER TABLE auto_reply_settings
  ADD COLUMN IF NOT EXISTS auto_reply_1_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_2_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_3_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_4_star BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_5_star BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_auto_reply_settings_enabled_fast 
  ON auto_reply_settings(enabled, require_approval) 
  WHERE enabled = true AND require_approval = false;
```

---

## 🧪 **التحقق:**

```sql
-- افحص إذا الجدول موجود
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'auto_reply_settings'
);
-- يجب أن يرجع: true

-- افحص الأعمدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auto_reply_settings'
ORDER BY ordinal_position;
```

---

## 🚀 **بعد التطبيق:**

1. حدّث الصفحة: `https://www.nnh.ae/settings/auto-pilot`
2. المفروض تشتغل بدون أخطاء
3. إذا ما في settings، بيطلع الإعدادات الافتراضية

---

## 📊 **الإعدادات الافتراضية:**

```typescript
{
  enabled: false,
  requireApproval: false,
  tone: 'friendly',
  autoReply1Star: true,
  autoReply2Star: true,
  autoReply3Star: true,
  autoReply4Star: true,
  autoReply5Star: true
}
```

---

## 🔍 **ملفات التنفيذ:**

- Migration: `supabase/migrations/20250115_create_auto_reply_settings.sql`
- API: `app/api/reviews/auto-reply/route.ts`
- Server Action: `server/actions/auto-reply.ts`
- Frontend: `app/[locale]/(dashboard)/settings/auto-pilot/page.tsx`

---

**تاريخ الإصلاح:** 2025-11-18
**الحالة:** جاهز للتطبيق

