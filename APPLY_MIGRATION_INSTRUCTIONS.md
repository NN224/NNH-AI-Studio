# 🚀 تطبيق Migration - 3 طرق

## الطريقة 1: عبر Supabase Dashboard (الأسهل) ⭐

### الخطوات:

1. **افتح Supabase Dashboard:**
   ```
   https://app.supabase.com
   ```

2. **اذهب إلى SQL Editor:**
   ```
   Projects → [اختر مشروعك] → SQL Editor
   ```

3. **انسخ محتوى Migration:**
   ```bash
   cat supabase/migrations/20251127000000_add_missing_tables.sql
   ```

4. **الصق في SQL Editor واضغط Run**

5. **تحقق من النجاح:**
   - يجب أن ترى: "Success. No rows returned"
   - تحقق من Tables في Dashboard - يجب أن ترى 6 جداول جديدة

---

## الطريقة 2: عبر Supabase CLI (إذا كان مثبت)

### التثبيت (إذا لم يكن مثبت):

**على macOS:**
```bash
brew install supabase/tap/supabase
```

**على Linux:**
```bash
curl -fsSL https://github.com/supabase/cli/releases/download/v1.127.4/supabase_linux_amd64.tar.gz | tar xz
sudo mv supabase /usr/local/bin/
```

**على Windows:**
```powershell
scoop install supabase
```

### التطبيق:

```bash
# 1. تهيئة Supabase (أول مرة فقط)
supabase login

# 2. ربط المشروع
supabase link --project-ref [your-project-ref]

# 3. تطبيق Migration
supabase db push

# 4. التحقق
supabase db diff
```

---

## الطريقة 3: عبر PostgreSQL Client مباشرة

### إذا كان لديك psql:

```bash
# 1. احصل على Database URL من Supabase Dashboard:
# Settings → Database → Connection String

# 2. طبّق Migration:
psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" \
  -f supabase/migrations/20251127000000_add_missing_tables.sql

# 3. تحقق من النجاح
```

---

## التحقق من نجاح التطبيق ✅

بعد تطبيق الـ migration بأي طريقة، شغّل هذا SQL للتحقق:

```sql
-- في SQL Editor أو psql
SELECT table_name,
       (SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
  'teams',
  'team_members',
  'team_invitations',
  'brand_profiles',
  'autopilot_logs',
  'question_templates'
)
ORDER BY table_name;
```

**النتيجة المتوقعة:**
```
table_name          | column_count
--------------------+-------------
autopilot_logs      | 14
brand_profiles      | 15
question_templates  | 13
team_invitations    | 11
team_members        | 8
teams               | 10
```

إذا رأيت 6 rows، الـ migration نجح! ✅

---

## التحقق من RLS Policies:

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'teams',
  'team_members',
  'team_invitations',
  'brand_profiles',
  'autopilot_logs',
  'question_templates'
)
ORDER BY tablename, policyname;
```

يجب أن ترى عدة policies لكل جدول.

---

## إذا واجهت مشاكل:

### Error: "relation already exists"
```sql
-- يعني الجدول موجود مسبقاً، يمكنك تخطي الخطأ
-- أو احذف الجدول وأعد تطبيق Migration:
DROP TABLE IF EXISTS teams CASCADE;
-- ثم أعد تطبيق Migration
```

### Error: "permission denied"
- تأكد أنك مسجل دخول كـ admin
- تأكد من استخدام service role key

### Error: "database connection failed"
- تحقق من Database URL
- تحقق من أن Database شغال في Supabase Dashboard

---

## بعد التطبيق الناجح:

1. ✅ اختبر الموقع:
   ```bash
   npm run dev
   # افتح http://localhost:5050/en/dashboard
   ```

2. ✅ تحقق من عدم وجود أخطاء في Console

3. ✅ اختبر Onboarding page

4. ✅ اختبر Questions page

---

## الطريقة الموصى بها:

**الطريقة 1 (Dashboard)** هي الأسهل والأكثر أماناً للمرة الأولى.

---

**أي طريقة تختار؟ أنا جاهز للمساعدة! 🚀**
