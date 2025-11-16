# 🔴 **تشخيص المشاكل الحالية**

**التاريخ:** 2025-11-16  
**الحالة:** 🔍 قيد التشخيص

---

## **المشاكل المكتشفة من الصور:**

### **1. Logo طلع بمكان واحد بس** 🖼️

**الملاحظة:**
```
✅ Logo يظهر في بعض الأماكن
❌ Logo لا يظهر في Dashboard Header
❌ "No logo and cover found on your GMB profile"
```

**السبب:**
```sql
-- في gmb_locations table
SELECT logo_url FROM gmb_locations WHERE is_active = true;
-- النتيجة: NULL ❌
```

**التشخيص:**
- ✅ الكود صحيح (`BusinessHeader.tsx` يقرأ `logo_url`)
- ❌ المشكلة: `logo_url` في DB = `NULL`
- ❌ السبب: لم يتم عمل Sync بعد إضافة الـ column

**الحل:**
```bash
# 1. تطبيق Migration
supabase db push

# 2. تشغيل Sync جديد
# Dashboard → Sync Button
```

---

### **2. Average Rating = 0.0 في Dashboard** ⭐

**الملاحظة:**
```
❌ Dashboard Home: 0.0/5.0
✅ Reviews Page: 4.7/5.0
```

**السبب:**
```typescript
// Dashboard يستخدم v_dashboard_stats
const { data: stats } = await supabase
  .from('v_dashboard_stats')
  .select('avg_rating')  // ❌ يرجع 0.0

// Reviews Page يحسب مباشرة
const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
// ✅ يرجع 4.7
```

**التشخيص:**
```sql
-- فحص v_dashboard_stats
SELECT 
  user_id,
  total_reviews,
  avg_rating,
  AVG(rating) as actual_avg
FROM v_dashboard_stats
LEFT JOIN gmb_reviews USING (user_id)
GROUP BY user_id;

-- النتيجة المتوقعة:
-- avg_rating: 0.0 ❌
-- actual_avg: 4.7 ✅
```

**السبب المحتمل:**
1. `v_dashboard_stats` view definition خاطئة
2. أو `rating` في `gmb_reviews` = `NULL`
3. أو `AVG()` function تحسب بشكل خاطئ

**الحل:**
```sql
-- فحص الـ View
SELECT pg_get_viewdef('v_dashboard_stats', true);

-- إصلاح الـ View
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
  user_id,
  COUNT(DISTINCT r.id) as total_reviews,
  COALESCE(AVG(r.rating) FILTER (WHERE r.rating > 0), 0) as avg_rating,  -- ✅ إصلاح
  -- ... rest
FROM gmb_reviews r
GROUP BY user_id;
```

---

### **3. "Sync failed - Account not found"** 🔴

**الملاحظة:**
```
❌ "Sync failed"
❌ "Account not found"
❌ هذا يمنع جلب Logo & Cover الجديدة
```

**السبب المحتمل:**

#### **A. Account ID Mismatch:**
```typescript
// في gmb-connection-manager.tsx
const handleSync = async (accountId: string) => {
  const response = await fetch('/api/gmb/sync', {
    body: JSON.stringify({ accountId })  // ❌ قد يكون خاطئ
  });
};

// في app/api/gmb/sync/route.ts
const { data: account } = await supabase
  .from('gmb_accounts')
  .select('*')
  .eq('id', accountId)  // ❌ لا يوجد
  .single();

if (!account) {
  return errorResponse('Account not found', 404);  // 🔴 هنا المشكلة
}
```

#### **B. Access Token Expired:**
```typescript
// Token expired ولم يتم refresh
if (account.token_expires_at < Date.now()) {
  // ❌ يجب refresh token
  // لكن الكود يرجع "Account not found" بدلاً من "Token expired"
}
```

#### **C. User ID Mismatch:**
```typescript
// Account موجود لكن لـ user آخر
const { data: account } = await supabase
  .from('gmb_accounts')
  .eq('id', accountId)
  .eq('user_id', user.id)  // ❌ mismatch
  .single();
```

**التشخيص المطلوب:**
```sql
-- 1. فحص gmb_accounts
SELECT 
  id,
  user_id,
  account_name,
  is_active,
  token_expires_at,
  CASE 
    WHEN token_expires_at < NOW() THEN '❌ Expired'
    ELSE '✅ Valid'
  END as token_status
FROM gmb_accounts
WHERE user_id = 'YOUR_USER_ID';

-- 2. فحص آخر Sync
SELECT 
  account_id,
  status,
  error_message,
  started_at,
  completed_at
FROM sync_logs
WHERE user_id = 'YOUR_USER_ID'
ORDER BY started_at DESC
LIMIT 5;

-- 3. فحص Sync Progress
SELECT * FROM sync_progress
WHERE user_id = 'YOUR_USER_ID'
ORDER BY updated_at DESC
LIMIT 1;
```

**الحل المقترح:**

#### **Option 1: إعادة الاتصال بـ GMB**
```
1. Settings → Connections
2. Disconnect GMB Account
3. Connect Again
4. تشغيل Sync
```

#### **Option 2: Refresh Token يدوياً**
```typescript
// إضافة endpoint جديد
// POST /api/gmb/refresh-token
export async function POST(request: NextRequest) {
  const { accountId } = await request.json();
  
  // Fetch account
  const { data: account } = await supabase
    .from('gmb_accounts')
    .select('*')
    .eq('id', accountId)
    .single();
  
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }
  
  // Refresh token
  const newToken = await refreshAccessToken(account.refresh_token);
  
  // Update account
  await supabase
    .from('gmb_accounts')
    .update({
      access_token: newToken.access_token,
      token_expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString()
    })
    .eq('id', accountId);
  
  return NextResponse.json({ success: true });
}
```

#### **Option 3: تحسين Error Handling**
```typescript
// في app/api/gmb/sync/route.ts
const { data: account, error: accountError } = await supabase
  .from('gmb_accounts')
  .select('*')
  .eq('id', accountId)
  .eq('user_id', user.id)
  .single();

if (accountError || !account) {
  console.error('[GMB Sync] Account query error:', {
    accountId,
    userId: user.id,
    error: accountError,
    accountFound: !!account
  });
  
  // ✅ رسالة خطأ أوضح
  return errorResponse(new ApiError(
    accountError?.code === 'PGRST116' 
      ? 'Account not found. Please reconnect your Google account.'
      : 'Failed to fetch account details.',
    404
  ));
}

// Check token expiry
if (new Date(account.token_expires_at) < new Date()) {
  console.warn('[GMB Sync] Token expired, attempting refresh...');
  try {
    const newToken = await refreshAccessToken(account.refresh_token);
    // Update token...
  } catch (error) {
    return errorResponse(new ApiError(
      'Your Google authorization has expired. Please reconnect your account.',
      401
    ));
  }
}
```

---

## 📊 **الخطوات التالية:**

### **1. تشخيص فوري:**
```sql
-- نفذ هذا SQL في Supabase Dashboard
SELECT 
  'gmb_accounts' as table_name,
  COUNT(*) as count,
  COUNT(CASE WHEN token_expires_at < NOW() THEN 1 END) as expired_tokens
FROM gmb_accounts
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'

UNION ALL

SELECT 
  'gmb_locations' as table_name,
  COUNT(*) as count,
  COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as has_logo
FROM gmb_locations
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d'

UNION ALL

SELECT 
  'gmb_reviews' as table_name,
  COUNT(*) as count,
  ROUND(AVG(rating), 2) as avg_rating
FROM gmb_reviews
WHERE user_id = 'e5ad5893-368c-4a66-bfd1-6d9091e6430d';
```

### **2. إصلاح Average Rating:**
```sql
-- فحص v_dashboard_stats definition
SELECT pg_get_viewdef('v_dashboard_stats', true);

-- إذا كان خاطئ، أصلحه:
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
  r.user_id,
  COUNT(DISTINCT l.id) as total_locations,
  COUNT(DISTINCT r.id) as total_reviews,
  COALESCE(
    AVG(r.rating) FILTER (WHERE r.rating IS NOT NULL AND r.rating > 0), 
    0
  )::numeric(10,2) as avg_rating,
  COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = false) as pending_reviews,
  COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = true) as replied_reviews,
  COUNT(DISTINCT q.id) FILTER (WHERE q.has_answer = false) as pending_questions,
  COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') as recent_reviews,
  CASE 
    WHEN COUNT(DISTINCT r.id) > 0 
    THEN (COUNT(DISTINCT r.id) FILTER (WHERE r.has_reply = true)::float / COUNT(DISTINCT r.id)::float * 100)::numeric(10,2)
    ELSE 0
  END as calculated_response_rate
FROM gmb_reviews r
LEFT JOIN gmb_locations l ON l.user_id = r.user_id AND l.is_active = true
LEFT JOIN gmb_questions q ON q.user_id = r.user_id
GROUP BY r.user_id;
```

### **3. تطبيق Migrations وتشغيل Sync:**
```bash
# 1. تطبيق migrations
supabase db push

# 2. إعادة الاتصال بـ GMB (إذا لزم الأمر)
# Dashboard → Settings → Connections → Reconnect

# 3. تشغيل Sync
# Dashboard → Sync Button

# 4. التحقق من النتائج
# - Logo يجب أن يظهر
# - Average Rating يجب أن يكون صحيح
# - Sync يجب أن ينجح
```

---

## ✅ **النتائج المتوقعة بعد الإصلاح:**

### **Dashboard:**
```json
{
  "total_reviews": 57,
  "avg_rating": 4.7,        // ✅ كان 0.0
  "pending_reviews": 1,
  "response_rate": 98.2
}
```

### **BusinessHeader:**
```json
{
  "location_name": "XO Club Dubai Talal",
  "logo_url": "https://...",     // ✅ كان NULL
  "cover_photo_url": "https://...",
  "rating": 4.7,
  "review_count": 57
}
```

### **Sync Status:**
```
✅ Sync successful
✅ 1 location synced
✅ 57 reviews synced
✅ Logo & Cover fetched
```

---

**الحالة:** 🔍 **جاهز للتشخيص والإصلاح**

**الخطوة التالية:** 
1. نفذ SQL التشخيصي أعلاه
2. أرسل النتائج
3. سأحدد الحل الدقيق بناءً على النتائج

