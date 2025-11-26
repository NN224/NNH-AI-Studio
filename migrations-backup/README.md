# 🔄 Database Migrations

## ⚠️ قاعدة إلزامية - CRITICAL RULE

**عند إضافة أو تعديل أي migration:**

```
✅ 1. أضف/عدل الـ migration في هذا المجلد
✅ 2. شغّل: npm run db:push
✅ 3. حدّث التوثيق - MANDATORY:

   a. Export Schema الجديد:
      → في Supabase SQL Editor
      → شغّل: scripts/export-complete-schema.sql
      → Export كـ CSV
      → احفظ: database-schema.csv (في الجذر)

   b. حدّث ملفات التوثيق:
      → google-api-docs/DATABASE_SCHEMA.md
      → google-api-docs/DATABASE_QUICK_REF.md

✅ 4. Commit الكل مع بعض:
   git add supabase/migrations/*.sql
   git add database-schema.csv
   git add google-api-docs/DATABASE_SCHEMA.md
   git commit -m "feat(db): وصف التعديل + update schema docs"
```

---

## 🚫 ممنوع منعاً باتاً

❌ تضيف migration بدون تحديث التوثيق
❌ تنسى export الـ schema الجديد
❌ تعمل commit للـ migration لوحدها

---

## 📋 Checklist

قبل كل migration:

- [ ] كتبت الـ migration SQL
- [ ] اختبرت الـ migration محلياً
- [ ] شغّلت `npm run db:push`
- [ ] Exported schema جديد (CSV)
- [ ] حدّثت `DATABASE_SCHEMA.md`
- [ ] حدّثت `DATABASE_QUICK_REF.md` (إذا ضروري)
- [ ] راجعت التوافق مع Google APIs
- [ ] Commit الكل مع بعض

---

## 🎯 أمثلة

### مثال 1: إضافة جدول جديد

```sql
-- 20250118_add_new_table.sql
CREATE TABLE public.new_table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
    ON public.new_table FOR SELECT
    USING (auth.uid() = user_id);
```

**بعد إضافة الـ migration:**

1. ✅ `npm run db:push`
2. ✅ Export schema → `database-schema.csv`
3. ✅ أضف الجدول في `DATABASE_SCHEMA.md`:

   ```markdown
   #### `new_table` (4 columns)

   **الاستخدام:** وصف الجدول

   **الأعمدة:**

   - `id` (uuid, PK)
   - `user_id` (uuid, FK → auth.users)
   - `name` (text)
   - `created_at` (timestamptz)
   ```

4. ✅ Commit الكل

### مثال 2: إضافة عمود لجدول موجود

```sql
-- 20250118_add_column_to_table.sql
ALTER TABLE public.existing_table
ADD COLUMN new_column text;

COMMENT ON COLUMN public.existing_table.new_column IS 'وصف العمود';
```

**بعد إضافة الـ migration:**

1. ✅ `npm run db:push`
2. ✅ Export schema → `database-schema.csv`
3. ✅ حدّث الجدول في `DATABASE_SCHEMA.md`:
   ```markdown
   #### `existing_table` (5 columns) ← كان 4

   ...

   - `new_column` (text) - وصف العمود
   ```
4. ✅ Commit الكل

---

## 🔧 أوامر مفيدة

### Local Development:

```bash
# تطبيق migrations محلياً
npx supabase db push

# إعادة تعيين قاعدة البيانات المحلية
npx supabase db reset

# إنشاء migration جديد
npx supabase migration new migration_name
```

### Production:

```bash
# Migrations تطبق تلقائياً عبر Supabase Dashboard
# أو عبر Supabase CLI
supabase db push
```

---

## 📊 Export Schema

### الطريقة الموصى بها:

1. **افتح Supabase Dashboard**
2. **اذهب إلى SQL Editor**
3. **شغّل السكريبت:**
   ```sql
   -- انسخ محتوى: scripts/export-complete-schema.sql
   -- والصقه في SQL Editor
   ```
4. **Export النتائج:**
   - Format: CSV
   - احفظ كـ: `database-schema.csv`

5. **انقل الملف للجذر:**
   ```bash
   mv ~/Downloads/database-schema.csv /path/to/project/
   ```

---

## 🎯 الهدف

**الهدف من هذا:** التوثيق يكون دائماً synchronized مع الـ schema الفعلي!

```
Migration ✅
   ↓
Schema Updated ✅
   ↓
Documentation Updated ✅
   ↓
Commit All Together ✅
```

---

## ⚠️ تذكّر

> **Schema بدون توثيق = Code بدون Comments = صعب الفهم!**

حافظ على التوثيق محدّث دائماً! 📚

---

**آخر تحديث:** نوفمبر 18، 2025
