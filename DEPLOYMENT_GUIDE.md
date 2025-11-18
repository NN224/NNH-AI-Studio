# 🚀 دليل نشر NNH AI Studio

## 🌐 البيئات المقترحة:

### 1. Development (محلي) 🖥️
```
http://localhost:5050
```
- **الاستخدام:** تطوير محلي على جهازك
- **الوصول:** أنت فقط
- **الأمر:** `npm run dev`

---

### 2. Staging/BETA (على دومين) 🧪
```
https://beta.nnh.ae
https://staging.nnh.ae
```
- **الاستخدام:** اختبار مع الفريق/العملاء
- **الوصول:** عام (لكن مع Basic Auth اختياري)
- **المنصة:** Vercel / AWS / DigitalOcean
- **الـ Branch:** `develop` أو `staging`

#### نشر على Vercel (BETA):

1. **ربط المشروع مع Vercel:**
```bash
npm i -g vercel
vercel login
vercel
```

2. **تعيين Environment Variables:**
```bash
# في Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# ... باقي المتغيرات
```

3. **إعداد Custom Domain:**
```
beta.nnh.ae → Vercel Project (Staging)
```

4. **Auto-Deploy:**
- كل push لـ `develop` branch → auto-deploy لـ beta.nnh.ae

---

### 3. Production (دومين رئيسي) 🚀
```
https://nnh.ae
https://app.nnh.ae
```
- **الاستخدام:** الموقع الحقيقي للمستخدمين
- **الوصول:** عام
- **المنصة:** Vercel / AWS
- **الـ Branch:** `main` أو `production`

#### نشر على Vercel (Production):

1. **نفس الخطوات السابقة** لكن:
   - Domain: `nnh.ae` أو `app.nnh.ae`
   - Branch: `main`
   - Environment: `production`

2. **إخفاء BETA Badge:**
   - في `components/common/beta-badge.tsx`:
   ```typescript
   export function BetaIndicator() {
     if (process.env.NODE_ENV === 'production') {
       return null; // ✅ يخفي البانر في Production
     }
     // ...
   }
   ```

---

## 📊 ملخص البيئات:

| البيئة | URL | Branch | Port | استخدام |
|--------|-----|--------|------|---------|
| **Development** | localhost:5050 | أي branch | 5050 | تطوير محلي |
| **Staging/BETA** | beta.nnh.ae | develop | - | اختبار عام |
| **Production** | nnh.ae | main | - | موقع حقيقي |

---

## 🔐 حماية بيئة BETA (اختياري):

إذا تبي beta.nnh.ae محمي بكلمة سر:

### في Vercel:
1. اذهب لـ **Settings** → **Deployment Protection**
2. فعّل **Password Protection**
3. اختر كلمة سر

### في Next.js (Middleware):
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // في BETA فقط
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging') {
    const basicAuth = request.headers.get('authorization');
    
    if (!basicAuth || !isValidAuth(basicAuth)) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Staging Environment"',
        },
      });
    }
  }
  // ...
}
```

---

## 🎯 الخطوات المقترحة:

### للتطوير المحلي (الآن):
```bash
npm run dev  # localhost:5050
```

### لنشر BETA (على دومين):
1. سجل في Vercel (مجاني)
2. ربط الـ repository
3. أضف `beta.nnh.ae` كـ custom domain
4. Auto-deploy من branch `develop`

### لنشر Production (لاحقاً):
1. نفس الخطوات
2. لكن domain: `nnh.ae`
3. Branch: `main`
4. إخفاء BETA indicators

---

## 💡 توصيات:

1. **الآن (Development):** 
   - استمر في التطوير على `localhost:5050`
   - ما تحتاج دومين

2. **عند الجاهزية للاختبار:**
   - انشر على `beta.nnh.ae`
   - اختبر مع فريقك/عملائك

3. **عند الإطلاق النهائي:**
   - انشر على `nnh.ae`
   - أزل BETA indicators

---

## 📝 ملاحظات:

- **localhost:5050** = تطوير شخصي (أنت فقط)
- **beta.nnh.ae** = اختبار عام (الكل يشوفه)
- **nnh.ae** = إنتاج نهائي (مستقر)

---

تبي أساعدك تنشر على beta.nnh.ae؟ 🚀

