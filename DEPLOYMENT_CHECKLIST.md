# ✅ قائمة التحقق من النشر (Deployment Checklist)

## 📝 ملخص التغييرات

### ✅ تم الإصلاح:
1. **OAuth States Foreign Key** - تم إصلاحه ✅
2. **gmb_media table** - تم إنشاؤه ✅
3. **Location IDs format** - تم إصلاحه في قاعدة البيانات ✅
4. **Sync Code** - تم تحديثه ليبني location resource تلقائياً ✅

### 📁 الملفات المعدلة:
- `app/api/gmb/create-auth-url/route.ts`
- `app/api/gmb/oauth-callback/route.ts`
- `app/api/gmb/sync/route.ts`
- `supabase/migrations/20250202_fix_oauth_states_user_id_fk.sql` (جديد)
- `supabase/migrations/20250202_create_gmb_media_table.sql` (جديد)

---

## 🚀 خطوات النشر

### 1️⃣ Supabase Migrations (مهم!)

**تطبيق Migrations الجديدة:**

في Supabase Dashboard → SQL Editor، شغل:

```sql
-- السكريبت 1: إصلاح oauth_states FK
-- من: supabase/migrations/20250202_fix_oauth_states_user_id_fk.sql

-- السكريبت 2: إنشاء gmb_media table
-- من: supabase/migrations/20250202_create_gmb_media_table.sql
```

**أو شغل:**
- `SQL_SCRIPTS_FIXED.sql` (يحتوي على كل شيء)

**✅ تم تطبيقه بالفعل:**
- ✅ `FIX_LOCATION_IDS_SIMPLE.sql` - تم ✅

---

### 2️⃣ حفظ التغييرات في Replit

**في Replit:**

1. ✅ **Save All Files** (Cmd+S / Ctrl+S)
   - تأكد أن جميع الملفات محفوظة

2. ✅ **Git Commit & Push** (إذا كنت تستخدم Git):
   ```bash
   git add .
   git commit -m "Fix GMB OAuth: location_id format, reviews/media sync"
   git push origin main
   ```

---

### 3️⃣ إعادة بناء التطبيق (Rebuild)

**في Replit:**

#### Option A: إذا كان Auto-Deploy مفعل:
- التغييرات تُطبّق تلقائياً بعد Save

#### Option B: Rebuild يدوياً:
1. اضغط على **Stop** (إيقاف التطبيق)
2. اضغط على **Run** مرة أخرى
3. أو استخدم Terminal:
   ```bash
   npm run build
   npm run start
   ```

---

### 4️⃣ التحقق من النشر

بعد Rebuild، تحقق من:

1. ✅ **OAuth يعمل:**
   - اذهب إلى `/gmb-dashboard`
   - اضغط "Connect Google My Business"
   - يجب أن يعمل بدون أخطاء Foreign Key

2. ✅ **Sync يعمل:**
   - بعد الاتصال، اضغط "Sync Data"
   - يجب أن يجلب Locations, Reviews, Media

3. ✅ **التحقق من قاعدة البيانات:**
   ```sql
   SELECT COUNT(*) FROM gmb_reviews;
   SELECT COUNT(*) FROM gmb_media;
   ```

---

## ⚠️ ملاحظات مهمة

### إذا كنت في Production (nnh.ae):

1. **Environment Variables:**
   تأكد من وجود:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://nnh.ae/api/gmb/oauth-callback
   NEXT_PUBLIC_BASE_URL=https://nnh.ae
   ```

2. **Google Cloud Console:**
   تأكد من:
   - Authorized redirect URIs: `https://nnh.ae/api/gmb/oauth-callback`
   - APIs مفعلة: Business Information API, Account Management API

### إذا كنت في Development (localhost):

- `NEXT_PUBLIC_BASE_URL=http://localhost:5000`
- `GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmb/oauth-callback`

---

## 📋 Checklist السريع

- [ ] Migrations مطبقة في Supabase
- [ ] Location IDs مصلحة في قاعدة البيانات ✅ (تم)
- [ ] الكود محفوظ في Replit
- [ ] Git push (إذا كنت تستخدم Git)
- [ ] Rebuild التطبيق
- [ ] اختبار OAuth Connection
- [ ] اختبار Sync
- [ ] التحقق من Reviews/Media في قاعدة البيانات

---

## ✅ النتيجة النهائية

بعد تطبيق كل شيء:
- ✅ OAuth يعمل بدون أخطاء
- ✅ Locations تُحفظ بنجاح
- ✅ Reviews تُحفظ (إذا كانت موجودة في GMB)
- ✅ Media يُحفظ (إذا كان موجوداً في GMB)

---

**هل تحتاج مساعدة في أي خطوة؟** 🚀

