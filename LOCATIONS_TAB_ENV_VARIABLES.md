# 🔑 Environment Variables المطلوبة لـ Locations Tab

## ✅ المفاتيح المطلوبة حالياً (موجودة بالفعل)

### 1. Google My Business API (GMB)
```bash
# مطلوبة لربط GMB accounts وجلب البيانات
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/gmb/oauth-callback
```

**الاستخدام:**
- ربط حسابات GMB
- جلب المواقع والمراجعات
- Sync البيانات

**كيفية الحصول عليها:**
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل Google My Business API
4. أنشئ OAuth 2.0 credentials
5. أضف Redirect URI: `https://yourdomain.com/api/gmb/oauth-callback`

---

### 2. Supabase (موجودة بالفعل)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**الاستخدام:**
- Database operations
- Authentication
- Real-time subscriptions

---

## ⚠️ المفاتيح الاختيارية (لتفعيل ميزات إضافية)

### 3. Google Maps API Key (لتفعيل Map Tab)
```bash
# Server-side only (آمن)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**الحالة الحالية:**
- ✅ API route موجود: `/api/google-maps-config/route.ts`
- ⚠️ Map Tab حالياً placeholder فقط
- 📝 يحتاج تفعيل Google Maps JavaScript API

**كيفية الحصول عليها:**
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. فعّل **Maps JavaScript API**
3. أنشئ API Key
4. قم بتقييد API Key:
   - Application restrictions: HTTP referrers
   - API restrictions: Maps JavaScript API فقط
5. أضف المفتاح في `.env.local`:
   ```bash
   GOOGLE_MAPS_API_KEY=AIzaSy...your_key
   ```

**ملاحظة أمان:**
- ✅ المفتاح موجود في server-side فقط (آمن)
- ✅ لا يتم إرساله للعميل مباشرة
- ✅ يتم جلب المفتاح من `/api/google-maps-config` endpoint

**لتفعيل Map Tab:**
1. أضف `GOOGLE_MAPS_API_KEY` في `.env.local`
2. قم بتحديث `locations-map-tab.tsx` لاستخدام `@react-google-maps/api`
3. المثال موجود في `LocationMapDashboard.tsx`

---

## 📋 ملخص المفاتيح

### مطلوبة (Essential):
- ✅ `GOOGLE_CLIENT_ID` - موجودة
- ✅ `GOOGLE_CLIENT_SECRET` - موجودة
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - موجودة
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - موجودة

### اختيارية (Optional):
- ⚠️ `GOOGLE_MAPS_API_KEY` - لتفعيل Map Tab
- ⚠️ `GOOGLE_REDIRECT_URI` - إذا كان مختلف عن الافتراضي

---

## 🔒 Security Best Practices

### ✅ ما تم تطبيقه:
1. **Google Maps API Key:**
   - ✅ موجود في server-side فقط
   - ✅ يتم جلب المفتاح من API route آمن
   - ✅ لا يتم تعريضه في client-side code

2. **GMB Credentials:**
   - ✅ موجودة في server-side فقط
   - ✅ لا يتم استخدام `NEXT_PUBLIC_` prefix

### ⚠️ ما يجب فعله:
1. **تقييد API Keys:**
   - قم بتقييد Google Maps API Key في Google Cloud Console
   - أضف HTTP referrers فقط لموقعك
   - قم بتقييد APIs المسموحة

2. **استخدام Environment Variables:**
   - لا تضع المفاتيح في الكود مباشرة
   - استخدم `.env.local` للتطوير
   - استخدم Vercel/Platform secrets للإنتاج

---

## 📝 خطوات الإعداد

### للتطوير (Development):
1. أنشئ ملف `.env.local` في root directory
2. أضف المفاتيح:
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_MAPS_API_KEY=your_maps_key  # اختياري
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### للإنتاج (Production):
1. في Vercel/Platform:
   - اذهب إلى Project Settings → Environment Variables
   - أضف جميع المفاتيح
   - تأكد من تعيينها لـ Production, Preview, Development

---

## 🧪 اختبار التكوين

### اختبار GMB Connection:
```bash
# جرب الاتصال بحساب GMB
curl -X POST http://localhost:3000/api/gmb/create-auth-url
```

### اختبار Google Maps:
```bash
# تحقق من API route
curl http://localhost:3000/api/google-maps-config
```

---

## ❓ FAQ

**س: هل أحتاج Google Maps API Key لتشغيل Locations Tab؟**
ج: لا، Locations Tab يعمل بدون Google Maps API Key. Map Tab فقط يحتاج المفتاح.

**س: هل المفاتيح آمنة؟**
ج: ✅ نعم، جميع المفاتيح موجودة في server-side فقط. Google Maps API Key يتم جلبها من server endpoint آمن.

**س: كيف أفعّل Map Tab؟**
ج: 
1. أضف `GOOGLE_MAPS_API_KEY` في `.env.local`
2. قم بتحديث `locations-map-tab.tsx` لاستخدام Google Maps
3. المثال موجود في `LocationMapDashboard.tsx`

---

**آخر تحديث:** 2025-01-08

