# إصلاح سريع - قاعدة البيانات 🚀

## المشكلة
قاعدة البيانات تحتاج عمود `user_id` في جدولين:
- `gmb_locations` 
- `gmb_reviews`

## الحل (5 دقائق)

### 1️⃣ افتح Supabase Dashboard
👉 [supabase.com/dashboard](https://supabase.com/dashboard)

### 2️⃣ اذهب إلى SQL Editor
من القائمة الجانبية → **SQL Editor** → **New query**

### 3️⃣ نفّذ هذا الكود (انسخ والصق)

```sql
-- إضافة عمود user_id
ALTER TABLE gmb_locations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE gmb_reviews
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_gmb_locations_user_id ON gmb_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_user_id ON gmb_reviews(user_id);
```

**اضغط RUN** ✅

### 4️⃣ ربط البيانات الموجودة (إذا كان عندك بيانات) ⚠️ مهم جداً!

**ملاحظة:** لازم تربط البيانات الموجودة بـ user_id **قبل** تفعيل RLS، وإلا البيانات ما راح تظهر لك!

أولاً، احصل على User ID الخاص بك:
```sql
SELECT id, email FROM auth.users;
```

ثم استبدل `YOUR_USER_ID` باللي ظهر لك (انسخ الـ id كامل):
```sql
UPDATE gmb_locations SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE gmb_reviews SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
```

**تأكد:** شغّل هذا الـ query وتأكد إنه تم تحديث البيانات:
```sql
SELECT COUNT(*) FROM gmb_locations WHERE user_id IS NOT NULL;
SELECT COUNT(*) FROM gmb_reviews WHERE user_id IS NOT NULL;
```

### 5️⃣ تفعيل الحماية (RLS)

```sql
-- تفعيل Row Level Security
ALTER TABLE gmb_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;

-- Policies للـ locations
CREATE POLICY "Users can view their own locations" ON gmb_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own locations" ON gmb_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own locations" ON gmb_locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own locations" ON gmb_locations FOR DELETE USING (auth.uid() = user_id);

-- Policies للـ reviews
CREATE POLICY "Users can view their own reviews" ON gmb_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reviews" ON gmb_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON gmb_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON gmb_reviews FOR DELETE USING (auth.uid() = user_id);
```

**اضغط RUN** ✅

---

## خلصنا! 🎉

**بعد ما تخلص:**
1. ارجع للتطبيق في Replit
2. سجّل دخول من جديد
3. افتح Dashboard
4. كل شيء يفترض يشتغل! ✅

---

## للتفاصيل الكاملة
شوف ملف: `DATABASE_MIGRATION_GUIDE.md`
