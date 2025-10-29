# دليل تطبيق Database Migration

## نظرة عامة

هذا الدليل يشرح كيفية تطبيق التحديثات المطلوبة على قاعدة بيانات Supabase لإصلاح المشاكل التالية:
- ❌ `column gmb_locations.user_id does not exist`
- ❌ `column gmb_reviews.user_id does not exist`

## الخطوات المطلوبة

### الخطوة 1: الدخول إلى Supabase SQL Editor

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك (GMB Platform)
3. من القائمة الجانبية، اختر **SQL Editor**
4. اضغط على **New query** لإنشاء استعلام جديد

### الخطوة 2: تطبيق Migration الأول - إضافة أعمدة user_id

انسخ محتوى الملف التالي والصقه في SQL Editor:

📁 **File:** `supabase/migrations/20251029_add_user_id_columns.sql`

```sql
-- Migration: Add user_id columns to gmb_locations and gmb_reviews tables
-- Created: 2025-10-29
-- Description: This migration adds user_id foreign key columns to enable multi-user support

-- Step 1: Add user_id column to gmb_locations table
ALTER TABLE gmb_locations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add user_id column to gmb_reviews table
ALTER TABLE gmb_reviews
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user_id ON gmb_reviews(user_id);

-- Step 4: Update existing rows to set user_id (if you have existing data)
-- Note: You'll need to manually update this query based on your actual user data
-- Example: UPDATE gmb_locations SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
-- Example: UPDATE gmb_reviews SET user_id = 'your-user-uuid' WHERE user_id IS NULL;

COMMENT ON COLUMN gmb_locations.user_id IS 'Foreign key to auth.users table - owner of this location';
COMMENT ON COLUMN gmb_reviews.user_id IS 'Foreign key to auth.users table - owner of this review';
```

**ثم اضغط:** `RUN` أو `Ctrl + Enter`

✅ **النتيجة المتوقعة:** `Success. No rows returned`

---

### الخطوة 3: تحديث البيانات الموجودة (إذا كان لديك بيانات)

إذا كان لديك locations أو reviews موجودة في قاعدة البيانات، يجب ربطها بمستخدم معين:

#### 3.1 - احصل على User UUID الخاص بك

```sql
SELECT id, email FROM auth.users;
```

انسخ الـ `id` (UUID) الخاص بحسابك.

#### 3.2 - تحديث Locations

استبدل `'your-user-uuid'` بالـ UUID الذي حصلت عليه من الخطوة السابقة:

```sql
UPDATE gmb_locations 
SET user_id = 'your-user-uuid' 
WHERE user_id IS NULL;
```

#### 3.3 - تحديث Reviews

```sql
UPDATE gmb_reviews 
SET user_id = 'your-user-uuid' 
WHERE user_id IS NULL;
```

---

### الخطوة 4: تطبيق Migration الثاني - تفعيل Row Level Security

انسخ محتوى الملف التالي والصقه في SQL Editor (استعلام جديد):

📁 **File:** `supabase/migrations/20251029_enable_rls_policies.sql`

```sql
-- Migration: Enable Row Level Security (RLS) and create policies
-- Created: 2025-10-29
-- Description: Enable RLS on gmb_locations and gmb_reviews tables with user-specific policies

-- Step 1: Enable Row Level Security on gmb_locations
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;

-- Step 2: Enable Row Level Security on gmb_reviews
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policy for gmb_locations - SELECT
CREATE POLICY "Users can view their own locations"
ON gmb_locations
FOR SELECT
USING (auth.uid() = user_id);

-- Step 4: Create RLS policy for gmb_locations - INSERT
CREATE POLICY "Users can insert their own locations"
ON gmb_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 5: Create RLS policy for gmb_locations - UPDATE
CREATE POLICY "Users can update their own locations"
ON gmb_locations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Create RLS policy for gmb_locations - DELETE
CREATE POLICY "Users can delete their own locations"
ON gmb_locations
FOR DELETE
USING (auth.uid() = user_id);

-- Step 7: Create RLS policy for gmb_reviews - SELECT
CREATE POLICY "Users can view their own reviews"
ON gmb_reviews
FOR SELECT
USING (auth.uid() = user_id);

-- Step 8: Create RLS policy for gmb_reviews - INSERT
CREATE POLICY "Users can insert their own reviews"
ON gmb_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 9: Create RLS policy for gmb_reviews - UPDATE
CREATE POLICY "Users can update their own reviews"
ON gmb_reviews
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 10: Create RLS policy for gmb_reviews - DELETE
CREATE POLICY "Users can delete their own reviews"
ON gmb_reviews
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own locations" ON gmb_locations IS 'Allow users to view only their own locations';
COMMENT ON POLICY "Users can view their own reviews" ON gmb_reviews IS 'Allow users to view only their own reviews';
```

**ثم اضغط:** `RUN` أو `Ctrl + Enter`

✅ **النتيجة المتوقعة:** `Success. No rows returned`

---

## التحقق من نجاح العملية

### 1. تحقق من الأعمدة الجديدة

```sql
-- Check gmb_locations columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'gmb_locations' AND column_name = 'user_id';

-- Check gmb_reviews columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'gmb_reviews' AND column_name = 'user_id';
```

✅ يجب أن ترى نتيجة تحتوي على `user_id` بنوع `uuid`

### 2. تحقق من RLS Policies

```sql
-- Check policies for gmb_locations
SELECT * FROM pg_policies WHERE tablename = 'gmb_locations';

-- Check policies for gmb_reviews
SELECT * FROM pg_policies WHERE tablename = 'gmb_reviews';
```

✅ يجب أن ترى 4 policies لكل جدول (SELECT, INSERT, UPDATE, DELETE)

---

## ما بعد التطبيق

1. **أعد تشغيل التطبيق** على Replit
2. **سجّل دخول** إلى التطبيق
3. **تحقق من Dashboard** - يجب أن يعمل بدون أخطاء

---

## استكشاف الأخطاء

### مشكلة: "policy already exists"

إذا ظهرت رسالة أن الـ policy موجودة مسبقاً، احذفها أولاً:

```sql
DROP POLICY IF EXISTS "Users can view their own locations" ON gmb_locations;
-- كرر لكل policy
```

ثم أعد تطبيق migration الثاني.

### مشكلة: "cannot drop table because other objects depend on it"

لا تقلق، هذا طبيعي. فقط تابع الخطوات كما هي.

### مشكلة: لا أرى أي بيانات بعد تطبيق RLS

تأكد أنك ربطت البيانات الموجودة بـ user_id في الخطوة 3.

---

## ملاحظات مهمة

- ⚠️ **نسخة احتياطية:** يُنصح بأخذ نسخة احتياطية قبل تطبيق أي migration
- 🔒 **RLS:** بعد تفعيل RLS، كل مستخدم سيرى فقط بياناته الخاصة
- 🔑 **user_id:** كل location/review جديد سيُربط تلقائياً بالمستخدم الذي أنشأه

---

## الدعم

إذا واجهت أي مشكلة، تواصل معي وسأساعدك في الحل! 😊
