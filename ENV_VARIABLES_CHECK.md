# 🔍 فحص أسماء مفاتيح البيئة (Environment Variables)

## ✅ المفاتيح الصحيحة (المستخدمة في الكود)

### 1. Supabase - Client Side (مطلوبة)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
**المستخدمة في:**
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client
- `lib/supabase/middleware.ts` - Middleware

### 2. Supabase - Server Side (مطلوبة)
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
**المستخدمة في:**
- `lib/supabase/server.ts` - Admin client (`createAdminClient()`)

---

## ❌ المفاتيح غير المستخدمة (يمكن حذفها)

### 1. `SUPABASE_ANON_KEY`
- ❌ **غير مستخدم في الكود**
- ✅ **المستخدم هو:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **التوصية:** احذف هذا المفتاح أو أعد تسميته إلى `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. `SUPABASE_URL`
- ❌ **غير مستخدم في الكود**
- ✅ **المستخدم هو:** `NEXT_PUBLIC_SUPABASE_URL`
- **التوصية:** احذف هذا المفتاح أو أعد تسميته إلى `NEXT_PUBLIC_SUPABASE_URL`

---

## ❓ المفاتيح الاختيارية (غير مستخدمة حالياً)

### 1. `SUPABASE_JWT_SECRET`
- ❓ **غير مستخدم في الكود حالياً**
- **التوصية:** يمكن الاحتفاظ به للمستقبل أو حذفه

### 2. `POSTGRES_URL`
- ❓ **غير مستخدم في الكود حالياً**
- **التوصية:** يمكن الاحتفاظ به للمستقبل أو حذفه

---

## 📋 ملخص التوصيات

### ✅ المفاتيح المطلوبة (يجب أن تكون موجودة):
1. `NEXT_PUBLIC_SUPABASE_URL` ✅
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
3. `SUPABASE_SERVICE_ROLE_KEY` ✅

### ❌ المفاتيح الزائدة (يمكن حذفها):
1. `SUPABASE_ANON_KEY` ❌ (استخدم `NEXT_PUBLIC_SUPABASE_ANON_KEY` بدلاً منه)
2. `SUPABASE_URL` ❌ (استخدم `NEXT_PUBLIC_SUPABASE_URL` بدلاً منه)

### ❓ المفاتيح الاختيارية:
1. `SUPABASE_JWT_SECRET` ❓ (اختياري)
2. `POSTGRES_URL` ❓ (اختياري)

---

## 🔧 الإجراءات المطلوبة

### في Vercel Dashboard:

1. **احذف المفاتيح الزائدة:**
   - `SUPABASE_ANON_KEY` (إذا لم يكن مستخدماً في أماكن أخرى)
   - `SUPABASE_URL` (إذا لم يكن مستخدماً في أماكن أخرى)

2. **تأكد من وجود المفاتيح الصحيحة:**
   - `NEXT_PUBLIC_SUPABASE_URL` ✅
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅

3. **المفاتيح الاختيارية:**
   - `SUPABASE_JWT_SECRET` (يمكن الاحتفاظ به)
   - `POSTGRES_URL` (يمكن الاحتفاظ به)

---

## 📝 ملاحظات

- جميع المفاتيح التي تبدأ بـ `NEXT_PUBLIC_` تكون مرئية في المتصفح (client-side)
- المفاتيح بدون `NEXT_PUBLIC_` تكون server-side only (أكثر أماناً)
- `SUPABASE_SERVICE_ROLE_KEY` يجب أن يكون Sensitive (server-side only)

**آخر تحديث:** 2025-01-08

