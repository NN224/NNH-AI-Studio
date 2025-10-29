# قائمة التحقق قبل النشر للإنتاج

## ✅ ما تم إنجازه:

### 1. إعدادات التطبيق
- ✅ إزالة `ignoreBuildErrors` من next.config.mjs
- ✅ إصلاح جميع أخطاء TypeScript
- ✅ البناء النهائي ينجح بدون أخطاء
- ✅ جميع المفاتيح البيئية موجودة في Replit Secrets
- ✅ إعدادات النشر (Deployment Config) جاهزة

### 2. المفاتيح البيئية المُعدة
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ GROQ_API_KEY
- ✅ DEEPSEEK_API_KEY
- ✅ TOGETHER_API_KEY

---

## ⚠️ ما يجب عمله في Supabase قبل النشر:

### 1. تفعيل Row Level Security (RLS) - **حرج جداً!**

يجب تفعيل RLS على جميع الجداول لحماية البيانات:

#### خطوات التفعيل:
1. ادخل على Supabase Dashboard → Authentication → Policies
2. لكل جدول من الجداول التالية، فعّل RLS:
   - `gmb_accounts`
   - `gmb_locations`
   - `gmb_reviews`
   - `activity_logs`
   - `profiles`

#### سياسات الأمان الموصى بها:

**للجدول `profiles`:**
```sql
-- المستخدمون يقدرون يشوفوا بياناتهم فقط
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- المستخدمون يقدرون يعدّلوا بياناتهم فقط
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

**للجدول `gmb_accounts`:**
```sql
-- المستخدمون يشوفوا حساباتهم فقط
CREATE POLICY "Users can view own accounts"
ON gmb_accounts FOR SELECT
USING (auth.uid() = user_id);

-- المستخدمون يقدرون يضيفوا حسابات
CREATE POLICY "Users can insert own accounts"
ON gmb_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- المستخدمون يقدرون يعدّلوا حساباتهم
CREATE POLICY "Users can update own accounts"
ON gmb_accounts FOR UPDATE
USING (auth.uid() = user_id);

-- المستخدمون يقدرون يحذفوا حساباتهم
CREATE POLICY "Users can delete own accounts"
ON gmb_accounts FOR DELETE
USING (auth.uid() = user_id);
```

**للجدول `gmb_locations`:**
```sql
-- المستخدمون يشوفوا مواقعهم فقط
CREATE POLICY "Users can view own locations"
ON gmb_locations FOR SELECT
USING (auth.uid() = user_id);

-- المستخدمون يقدرون يضيفوا مواقع
CREATE POLICY "Users can insert own locations"
ON gmb_locations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- المستخدمون يقدرون يعدّلوا مواقعهم
CREATE POLICY "Users can update own locations"
ON gmb_locations FOR UPDATE
USING (auth.uid() = user_id);

-- المستخدمون يقدرون يحذفوا مواقعهم
CREATE POLICY "Users can delete own locations"
ON gmb_locations FOR DELETE
USING (auth.uid() = user_id);
```

**للجدول `gmb_reviews`:**
```sql
-- المستخدمون يشوفوا تقييماتهم فقط
CREATE POLICY "Users can view own reviews"
ON gmb_reviews FOR SELECT
USING (auth.uid() = user_id);

-- المستخدمون يقدرون يضيفوا تقييمات
CREATE POLICY "Users can insert own reviews"
ON gmb_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- المستخدمون يقدرون يعدّلوا تقييماتهم
CREATE POLICY "Users can update own reviews"
ON gmb_reviews FOR UPDATE
USING (auth.uid() = user_id);
```

**للجدول `activity_logs`:**
```sql
-- المستخدمون يشوفوا نشاطاتهم فقط
CREATE POLICY "Users can view own activity"
ON activity_logs FOR SELECT
USING (auth.uid() = user_id);

-- المستخدمون يقدرون يضيفوا نشاطات
CREATE POLICY "Users can insert own activity"
ON activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 2. نشر Supabase Edge Functions

عندك 6 Edge Functions يجب نشرها:

#### خطوات النشر:
```bash
# 1. ثبّت Supabase CLI (إذا ما عندك)
npm install -g supabase

# 2. سجّل دخول
supabase login

# 3. اربط المشروع
supabase link --project-ref YOUR_PROJECT_REF

# 4. انشر كل الـ Functions
supabase functions deploy ai-generate
supabase functions deploy account-disconnect
supabase functions deploy create-auth-url
supabase functions deploy gmb-sync
supabase functions deploy google-oauth-callback
supabase functions deploy review-reply
```

#### أضف المفاتيح البيئية للـ Functions:
```bash
# للـ Google OAuth
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
supabase secrets set GOOGLE_REDIRECT_URI=https://YOUR_PROJECT.supabase.co/functions/v1/google-oauth-callback

# للـ AI APIs
supabase secrets set GROQ_API_KEY=your_groq_key
supabase secrets set DEEPSEEK_API_KEY=your_deepseek_key
supabase secrets set TOGETHER_API_KEY=your_together_key
```

### 3. إعداد Google OAuth للإنتاج

#### في Google Cloud Console:
1. افتح [Google Cloud Console](https://console.cloud.google.com/)
2. روح على **APIs & Services** → **Credentials**
3. اختر الـ OAuth 2.0 Client ID الموجود
4. أضف الـ Authorized redirect URIs التالية:
   ```
   https://YOUR_REPLIT_URL
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   https://YOUR_PROJECT.supabase.co/functions/v1/google-oauth-callback
   ```
5. أضف الـ Authorized JavaScript origins:
   ```
   https://YOUR_REPLIT_URL
   ```

### 4. تشغيل SQL Scripts

في Supabase SQL Editor، شغّل الملفات التالية بالترتيب:
1. `scripts/001_create_gmb_schema.sql` - ينشئ الجداول والـ indexes
2. `scripts/002_create_profile_trigger.sql` - ينشئ trigger لإنشاء profile تلقائياً

---

## 🚀 جاهز للنشر!

بعد ما تخلص كل الخطوات فوق:

1. **في Replit:**
   - اضغط على زر **Deploy** 
   - اختر **Autoscale Deployment**
   - تأكد من إعدادات البناء:
     - Build Command: `npm run build`
     - Run Command: `npm run start`

2. **اختبر التطبيق:**
   - جرّب تسجيل الدخول بكل الطرق
   - جرّب ربط حساب Google My Business
   - تأكد من أن البيانات تظهر بشكل صحيح

3. **راقب الأداء:**
   - تابع Logs في Replit Dashboard
   - تابع Edge Functions logs في Supabase

---

## 📝 ملاحظات مهمة:

- **التكلفة:** تأكد من فهمك لأسعار Replit Deployments و Supabase
- **النسخ الاحتياطي:** Supabase يعمل نسخ احتياطي تلقائي للقاعدة
- **المراقبة:** استخدم Vercel Analytics و Speed Insights لمتابعة الأداء
- **الأمان:** لا تشارك الـ secrets أبداً ولا تضيفها في الكود

---

## 🆘 في حال واجهت مشاكل:

1. **مشاكل المصادقة:** تحقق من إعدادات Google OAuth
2. **مشاكل قاعدة البيانات:** تأكد من تفعيل RLS وإضافة الـ Policies
3. **مشاكل Edge Functions:** تحقق من الـ logs في Supabase Dashboard
4. **مشاكل البناء:** تحقق من الـ logs في Replit Deploy Dashboard
