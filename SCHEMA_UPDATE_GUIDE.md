# 🔄 دليل تحديث Schema

## ⚠️ قاعدة إلزامية

**عند أي تعديل على Database Schema:**

```
Schema Change → MUST Update Documentation!
```

---

## 🚀 الطريقة السريعة (موصى بها)

```bash
# 1. أضف/عدل migration
nano supabase/migrations/20250118_my_changes.sql

# 2. طبّق محلياً
npm run db:push

# 3. شغّل المساعد
npm run db:update-docs

# سيذكّرك بكل الخطوات:
# - Export schema من Supabase
# - تحديث التوثيق
# - Stage الملفات
```

---

## 📋 الطريقة الكاملة (خطوة بخطوة)

### 1️⃣ إضافة Migration

```bash
# استخدم Template
cp supabase/migrations/_TEMPLATE.sql supabase/migrations/20250118_my_changes.sql

# عدّل الملف
nano supabase/migrations/20250118_my_changes.sql
```

### 2️⃣ اختبار محلياً

```bash
# طبّق المضافة
npx supabase db push

# أو إذا عندك npm script:
npm run db:push
```

### 3️⃣ Export Schema من Supabase

**في Supabase Dashboard:**

1. اذهب إلى **SQL Editor**
2. انسخ محتوى: `scripts/export-complete-schema.sql`
3. الصق في SQL Editor
4. **Run**
5. **Export results** → Format: **CSV**
6. احفظ كـ: `database-schema.csv`
7. انقل الملف لجذر المشروع

### 4️⃣ تحديث التوثيق

#### A. `google-api-docs/DATABASE_SCHEMA.md`

**إذا أضفت جدول جديد:**

```markdown
#### `new_table` (X columns) - Size
**الاستخدام:** وصف الجدول

**الأعمدة الرئيسية:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `name` (text)
- `created_at` (timestamptz)
```

**إذا أضفت عمود:**

```markdown
#### `existing_table` (5 columns) ← كان 4
...
- `new_column` (text) - وصف العمود
```

**حدّث الأرقام في الملخص:**

```markdown
## 📊 ملخص قاعدة البيانات

الجداول:        24 جدول  ← حدّث الرقم
الأعمدة:         462 عمود ← حدّث الرقم
```

#### B. `google-api-docs/DATABASE_QUICK_REF.md`

فقط إذا الجدول الجديد من الأساسيات، أضفه في:

```markdown
## 🔥 الجداول الأكثر استخداماً

### X. `new_table` (N cols) - الوصف
...
```

### 5️⃣ Commit الكل مع بعض

```bash
# Stage الملفات
git add supabase/migrations/20250118_my_changes.sql
git add database-schema.csv
git add google-api-docs/DATABASE_SCHEMA.md
git add google-api-docs/DATABASE_QUICK_REF.md

# Commit
git commit -m "feat(db): add new_table + update schema docs"

# Push
git push
```

---

## 🎯 أمثلة حقيقية

### مثال 1: إضافة جدول `notifications_settings`

```sql
-- supabase/migrations/20250118_add_notifications_settings.sql
CREATE TABLE public.notifications_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own settings"
    ON public.notifications_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

**بعدها:**

1. ✅ `npm run db:push`
2. ✅ Export schema → `database-schema.csv`
3. ✅ أضف في `DATABASE_SCHEMA.md`:

```markdown
### 6. Notifications Tables

#### `notifications_settings` (5 columns) - 40 kB
**الاستخدام:** إعدادات الإشعارات للمستخدمين
- **Indexes:** 2

**الأعمدة:**
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `email_enabled` (boolean)
- `push_enabled` (boolean)
- `created_at` (timestamptz)
```

4. ✅ حدّث الملخص: `25 جدول` (كان 24)
5. ✅ Commit الكل

### مثال 2: إضافة عمود `priority` لـ `notifications`

```sql
-- supabase/migrations/20250118_add_priority_to_notifications.sql
ALTER TABLE public.notifications
ADD COLUMN priority text DEFAULT 'normal';

COMMENT ON COLUMN public.notifications.priority IS 'Notification priority: low/normal/high';

-- Add index
CREATE INDEX idx_notifications_priority ON public.notifications(priority);
```

**بعدها:**

1. ✅ `npm run db:push`
2. ✅ Export schema → `database-schema.csv`
3. ✅ حدّث في `DATABASE_SCHEMA.md`:

```markdown
#### `notifications` (19 columns) ← كان 18
...
- `priority` (text) - Notification priority: low/normal/high
```

4. ✅ حدّث الملخص: `463 عمود` (كان 462)
5. ✅ Commit الكل

---

## 🔍 Checklist النهائي

قبل الـ commit، تأكد:

- [ ] Migration file موجود في `supabase/migrations/`
- [ ] Tested محلياً بنجاح
- [ ] `database-schema.csv` محدّث
- [ ] `DATABASE_SCHEMA.md` محدّث
- [ ] `DATABASE_QUICK_REF.md` محدّث (إذا ضروري)
- [ ] الأرقام في الملخص صحيحة
- [ ] جميع الملفات staged
- [ ] Commit message واضح

---

## 🚫 أخطاء شائعة

### ❌ خطأ 1: نسيت export schema
```bash
git commit -m "add migration"  # ناقص!
```

**✅ الصحيح:**
```bash
# Export schema أولاً
# ثم:
git add supabase/migrations/*.sql database-schema.csv google-api-docs/*.md
git commit -m "feat(db): add table + update docs"
```

### ❌ خطأ 2: حدّثت migration بعد الـ commit

**الحل:**
```bash
# عدّل الـ migration
# اعمل Export جديد
# حدّث التوثيق
# اعمل commit جديد
git add .
git commit -m "fix(db): update migration + schema docs"
```

### ❌ خطأ 3: نسيت تحديث الأرقام في الملخص

**الحل:**
- راجع `database-schema.csv`:
  - عدّ السطور اللي فيها `--- TABLE ---`
  - عدّ السطور اللي فيها `--- COLUMN ---`
- حدّث الأرقام في `DATABASE_SCHEMA.md`

---

## 💡 نصائح

### 1. استخدم Template
```bash
cp supabase/migrations/_TEMPLATE.sql supabase/migrations/new_migration.sql
```

### 2. اختبر دائماً محلياً أولاً
```bash
npx supabase db push
# اختبر التطبيق
# تأكد كل شي شغال
```

### 3. Export بعد كل migration
لا تنتظر - export مباشرة بعد التطبيق

### 4. اكتب comments في SQL
```sql
COMMENT ON TABLE public.table_name IS 'وصف الجدول';
COMMENT ON COLUMN public.table_name.column IS 'وصف العمود';
```

### 5. استخدم المساعد
```bash
npm run db:update-docs
```

---

## 📞 مساعدة

إذا نسيت شي، راجع:
- 📖 `supabase/migrations/README.md`
- 📖 `google-api-docs/DATABASE_SCHEMA.md`
- 📖 `BETA_STATUS_GUIDE.md` (قسم Schema)

---

**تذكّر:** Schema + Documentation = ❤️

**آخر تحديث:** نوفمبر 18، 2025

