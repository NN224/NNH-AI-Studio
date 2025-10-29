# 🚀 دليل نشر GMB Platform على nnh.ae

## 📋 الفهرس
1. [إعداد Google Cloud Console](#1-إعداد-google-cloud-console)
2. [إعداد Supabase](#2-إعداد-supabase)
3. [إعداد متغيرات البيئة في Replit](#3-إعداد-متغيرات-البيئة-في-replit)
4. [التأكد من التكوين](#4-التأكد-من-التكوين)

---

## 1. إعداد Google Cloud Console

### الخطوة 1: إنشاء مشروع جديد
1. افتح [Google Cloud Console](https://console.cloud.google.com)
2. اضغط على **Select a project** → **New Project**
3. اسم المشروع: `GMB Platform` (أو أي اسم تريده)
4. اضغط **Create**

### الخطوة 2: تفعيل APIs المطلوبة
في القائمة الجانبية: **APIs & Services** → **Enabled APIs & services** → **+ ENABLE APIS AND SERVICES**

ابحث وفعّل هذه الـ APIs:
- ✅ **Google Business Profile API**
- ✅ **My Business Business Information API**
- ✅ **My Business Account Management API**
- ✅ **My Business Verifications API**

> **⚠️ مهم:** قد تحتاج تقديم [طلب الوصول](https://developers.google.com/my-business/content/prerequisites) للـ APIs. الموافقة تأخذ 2-3 أيام عمل.

### الخطوة 3: إعداد OAuth Consent Screen
1. اذهب إلى: **APIs & Services** → **OAuth consent screen**
2. اختر: **External** → اضغط **CREATE**
3. املأ المعلومات:
   - **App name:** GMB Platform
   - **User support email:** بريدك الإلكتروني
   - **Developer contact information:** بريدك الإلكتروني
4. اضغط **SAVE AND CONTINUE**

#### إضافة Scopes:
5. في صفحة **Scopes**، اضغط **ADD OR REMOVE SCOPES**
6. أضف هذه الـ Scopes بالضبط:
   ```
   https://www.googleapis.com/auth/business.manage
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```
7. اضغط **UPDATE** → **SAVE AND CONTINUE**

#### إضافة Test Users (للتطوير):
8. في صفحة **Test users**، اضغط **+ ADD USERS**
9. أضف البريد الإلكتروني اللي تستخدمه في Google My Business
10. اضغط **SAVE AND CONTINUE**

### الخطوة 4: إنشاء OAuth 2.0 Credentials
1. اذهب إلى: **APIs & Services** → **Credentials**
2. اضغط **+ CREATE CREDENTIALS** → **OAuth client ID**
3. اختر **Application type:** `Web application`
4. **Name:** `GMB Platform Web Client`

#### ⚠️ الخطوة الأهم - Authorized redirect URIs:
5. في قسم **Authorized redirect URIs**، اضغط **+ ADD URI**
6. أضف هذا الرابط **بالضبط**:
   ```
   https://nnh.ae/api/gmb/oauth-callback
   ```
   
   > **مهم جداً:**
   > - ✅ استخدم `https://` وليس `http://`
   > - ✅ تأكد من الرابط كامل بالـ path: `/api/gmb/oauth-callback`
   > - ✅ لا تضع `/` في النهاية
   > - ⏰ التغييرات قد تأخذ 5 دقائق إلى ساعة حتى تطبق

7. (اختياري للتطوير) أضف URI تطوير:
   ```
   http://localhost:3000/api/gmb/oauth-callback
   ```

8. اضغط **CREATE**

### الخطوة 5: نسخ المفاتيح
بعد الإنشاء، سيظهر لك نافذة فيها:
- **Client ID** (يبدأ بـ `.apps.googleusercontent.com`)
- **Client Secret**

📋 **انسخ هذين المفتاحين** - سنستخدمهما في الخطوة 3.

---

## 2. إعداد Supabase

### الخطوة 1: إنشاء مشروع Supabase
1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اضغط **New Project**
3. املأ البيانات:
   - **Name:** `GMB Platform`
   - **Database Password:** (احفظ كلمة السر - مهمة!)
   - **Region:** اختر أقرب منطقة (مثل Frankfurt أو Singapore)
4. اضغط **Create new project**
5. انتظر دقيقتين حتى يجهز المشروع

### الخطوة 2: إعداد Authentication
1. في القائمة الجانبية: **Authentication** → **Providers**
2. فعّل **Email** (مفعل افتراضياً)
3. فعّل **Phone** إذا تبي تسمح بتسجيل دخول عن طريق الجوال

#### إعداد Google OAuth في Supabase:
4. ابحث عن **Google** في القائمة واضغط عليه
5. فعّل **Enable Sign in with Google**
6. املأ:
   - **Client ID:** (الي نسخته من Google Console في الخطوة 1)
   - **Client Secret:** (الي نسخته من Google Console في الخطوة 1)
7. اضغط **Save**

### الخطوة 3: إعداد Site URL
1. اذهب إلى: **Authentication** → **URL Configuration**
2. املأ:
   - **Site URL:** `https://nnh.ae`
   - **Redirect URLs:** 
     ```
     https://nnh.ae/**
     ```
3. اضغط **Save**

### الخطوة 4: نسخ مفاتيح Supabase
1. اذهب إلى: **Settings** → **API**
2. انسخ هذه المفاتيح:
   - **Project URL:** `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key:** `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (خطيرة - لا تشاركها!)

### الخطوة 5: تطبيق Database Migrations
1. في الـ Terminal في Replit، شغّل:
   ```bash
   npm run db:push
   ```
2. إذا طلب منك تأكيد، اكتب `yes`

---

## 3. إعداد متغيرات البيئة في Replit

### الخطوة 1: فتح Secrets Manager
1. في Replit، اضغط على **Tools** (في الشريط الجانبي)
2. اختر **Secrets**

### الخطوة 2: إضافة المفاتيح

#### مفاتيح Google OAuth:
انسخ والصق هذه المفاتيح مع القيم الصحيحة:

| Key | Value | المصدر |
|-----|-------|--------|
| `GOOGLE_CLIENT_ID` | `YOUR_CLIENT_ID.apps.googleusercontent.com` | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | `YOUR_CLIENT_SECRET` | Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | `https://nnh.ae/api/gmb/oauth-callback` | ثابت - استخدمه كما هو |

#### مفاتيح Supabase:
| Key | Value | المصدر |
|-----|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1...` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1...` | Supabase → Settings → API (⚠️ خطير!) |

#### مفاتيح إضافية:
| Key | Value | الاستخدام |
|-----|-------|----------|
| `NEXT_PUBLIC_BASE_URL` | `https://nnh.ae` | الدومين الرئيسي |
| `NEXT_PUBLIC_SITE_URL` | `https://nnh.ae` | URL الموقع |

---

## 4. التأكد من التكوين

### ✅ Checklist نهائي:

#### Google Cloud Console:
- [ ] تم تفعيل Google Business Profile APIs
- [ ] تم إعداد OAuth Consent Screen
- [ ] تم إضافة Scopes الثلاثة: `business.manage`, `userinfo.email`, `userinfo.profile`
- [ ] تم إنشاء OAuth Client ID (Web application)
- [ ] تم إضافة Redirect URI: `https://nnh.ae/api/gmb/oauth-callback`
- [ ] تم نسخ Client ID و Client Secret

#### Supabase:
- [ ] تم إنشاء المشروع
- [ ] تم تفعيل Email Authentication
- [ ] تم إعداد Google OAuth Provider (بنفس Client ID/Secret)
- [ ] تم تعيين Site URL: `https://nnh.ae`
- [ ] تم نسخ المفاتيح الثلاثة: URL, ANON_KEY, SERVICE_ROLE_KEY
- [ ] تم تطبيق Database Migrations (`npm run db:push`)

#### Replit Secrets:
- [ ] `GOOGLE_CLIENT_ID` - مضاف
- [ ] `GOOGLE_CLIENT_SECRET` - مضاف
- [ ] `GOOGLE_REDIRECT_URI` - مضاف: `https://nnh.ae/api/gmb/oauth-callback`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - مضاف
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - مضاف
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - مضاف
- [ ] `NEXT_PUBLIC_BASE_URL` - مضاف: `https://nnh.ae`

---

## 🧪 اختبار التكوين

### اختبار 1: Supabase Connection
```bash
# في Terminal:
curl -H "apikey: YOUR_ANON_KEY" https://YOUR_PROJECT_URL.supabase.co/rest/v1/
```
إذا رجع response، التكوين صحيح ✅

### اختبار 2: Google OAuth Flow
1. افتح الموقع: `https://nnh.ae`
2. سجل دخول أو أنشئ حساب
3. اذهب إلى صفحة **Accounts**
4. اضغط **Connect Google Account**
5. إذا فتحت صفحة Google للموافقة، التكوين صحيح ✅

### اختبار 3: OAuth Callback
بعد الموافقة في Google:
- يجب أن يرجع للموقع: `https://nnh.ae/accounts`
- يجب أن يظهر حسابك في القائمة
- إذا ظهر error في URL، راجع الـ Redirect URI في Google Console

---

## 🚨 حل المشاكل الشائعة

### خطأ: `redirect_uri_mismatch`
**السبب:** الـ Redirect URI غير متطابق
**الحل:**
1. تأكد أن الـ URI في Google Console بالضبط: `https://nnh.ae/api/gmb/oauth-callback`
2. انتظر 5-10 دقائق بعد التغيير
3. امسح cache المتصفح

### خطأ: `Invalid login credentials`
**السبب:** الـ Supabase credentials غلط
**الحل:**
1. راجع الـ Secrets في Replit
2. تأكد أن `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` صحيحة
3. تأكد أنك نسخت من الـ Project الصحيح في Supabase

### خطأ: `Failed to fetch GMB accounts`
**السبب:** قد يكون الـ Google Account ما عنده GMB locations
**الحل:**
1. تأكد أنك مسجل دخول بحساب Google له GMB locations
2. تأكد أنك وافقت على جميع الـ Scopes

### خطأ: `Database connection failed`
**السبب:** Database migrations ما تطبقت
**الحل:**
```bash
npm run db:push --force
```

---

## 📞 الدعم الفني

إذا واجهتك مشكلة:
1. راجع الـ Console Logs في المتصفح (F12)
2. راجع الـ Server Logs في Replit
3. تأكد من جميع الـ Checklist أعلاه
4. تأكد أن الـ Domain `nnh.ae` موجه للـ Replit deployment

---

## ✅ جاهز للنشر!

بعد إكمال جميع الخطوات أعلاه، المشروع جاهز للنشر على `nnh.ae` 🚀

استخدم زر **Deploy** في Replit لنشر المشروع على الـ production.

---

**تاريخ الإنشاء:** 29 أكتوبر 2025
**النسخة:** 1.0
**الدومين:** https://nnh.ae
