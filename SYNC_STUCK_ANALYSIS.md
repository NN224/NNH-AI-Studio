# 🔴 **تحليل مشكلة Sync Stuck**

**التاريخ:** 2025-11-16  
**الحالة:** 🔴 مشكلة حرجة

---

## 🔍 **المشكلة المكتشفة:**

### **البيانات:**
```json
[
  {
    "status": "running",
    "progress": 0,
    "started_at": "2025-11-16 22:38:46"  // منذ ساعات
  },
  {
    "status": "running",
    "progress": 0,
    "started_at": "2025-11-16 22:29:27"  // منذ ساعات
  },
  {
    "status": "running",
    "progress": 0,
    "started_at": "2025-11-16 10:19:29"  // منذ 12+ ساعة!
  }
]
```

### **التشخيص:**
```
❌ جميع الـ Sync operations عالقة في "running"
❌ progress = 0 (لم يتقدم أبداً)
❌ لا يوجد finished_at أو completed_at
❌ Sync بدأ لكن لم ينتهي أبداً
```

---

## 🔍 **الأسباب المحتملة:**

### **1. Exception غير معالج:**
```typescript
// في app/api/gmb/sync/route.ts
export async function POST(request: NextRequest) {
  const statusId = await createSyncStatusRecord(supabase, userId);
  
  try {
    // ... sync logic
    
    // ❌ إذا حدث exception هنا، finalize لن يتم استدعاؤه
    await finalizeSyncStatusRecord(supabase, statusId, 'success');
  } catch (error) {
    // ❌ إذا catch لم يتم الوصول إليه
    await finalizeSyncStatusRecord(supabase, statusId, 'failed', error.message);
  }
}
```

### **2. "Account not found" Error:**
```typescript
// الـ error اللي شفناه في الصورة:
// "Sync failed - Account not found"

// هذا يعني:
const { data: account } = await supabase
  .from('gmb_accounts')
  .select('*')
  .eq('id', accountId)
  .single();

if (!account) {
  // ❌ هنا يرجع error لكن لا يحدث sync_status
  return errorResponse(new ApiError('Account not found', 404));
}
```

### **3. Token Expired:**
```typescript
// إذا token expired:
if (new Date(account.token_expires_at) < new Date()) {
  // ❌ يحاول refresh لكن يفشل
  // ❌ لا يحدث sync_status
  throw new ApiError('Token expired', 401);
}
```

---

## 🔧 **الحلول:**

### **✅ حل فوري (تنظيف):**

```sql
-- نفذ FIX_STUCK_SYNCS.sql
-- هذا بيحدث جميع الـ Syncs العالقة إلى "failed"
```

### **✅ حل دائم (Code Fix):**

#### **A. تحسين Error Handling:**

```typescript
// app/api/gmb/sync/route.ts

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  let statusId: string | null = null;
  let userId: string | undefined;
  
  try {
    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new ApiError('Authentication required', 401);
    }
    userId = user.id;
    
    // 2. Create sync status record
    statusId = await createSyncStatusRecord(supabase, userId);
    
    // 3. Get account
    const { accountId } = await request.json();
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();
    
    if (accountError || !account) {
      // ✅ تحديث status قبل الرجوع
      await finalizeSyncStatusRecord(
        supabase, 
        statusId, 
        'failed', 
        'Account not found or access denied'
      );
      return errorResponse(new ApiError('Account not found', 404));
    }
    
    // 4. Check token expiry
    if (new Date(account.token_expires_at) < new Date()) {
      // ✅ تحديث status قبل محاولة refresh
      await updateSyncProgress(supabase, statusId, 10, 'Refreshing token...');
      
      try {
        const newToken = await refreshAccessToken(account.refresh_token);
        // Update token in DB...
      } catch (refreshError) {
        // ✅ تحديث status عند فشل refresh
        await finalizeSyncStatusRecord(
          supabase, 
          statusId, 
          'failed', 
          'Token refresh failed. Please reconnect your account.'
        );
        return errorResponse(new ApiError('Token expired', 401));
      }
    }
    
    // 5. Perform sync with progress updates
    await updateSyncProgress(supabase, statusId, 20, 'Fetching locations...');
    const locations = await fetchLocations(accessToken, accountId);
    
    await updateSyncProgress(supabase, statusId, 50, 'Fetching reviews...');
    const reviews = await fetchReviews(accessToken, locations);
    
    await updateSyncProgress(supabase, statusId, 80, 'Saving to database...');
    // ... save to DB
    
    // 6. Finalize success
    await finalizeSyncStatusRecord(supabase, statusId, 'success');
    
    return NextResponse.json({ success: true, counts: {...} });
    
  } catch (error: any) {
    console.error('[GMB Sync] Unexpected error:', error);
    
    // ✅ ALWAYS finalize on error
    if (statusId) {
      await finalizeSyncStatusRecord(
        supabase, 
        statusId, 
        'failed', 
        error.message || 'Unknown error'
      );
    }
    
    return errorResponse(error);
  }
}
```

#### **B. إضافة Progress Updates:**

```typescript
// Helper function جديدة
async function updateSyncProgress(
  supabase: SupabaseServerClient,
  statusId: string | null,
  progress: number,
  message?: string
) {
  if (!statusId) return;
  
  try {
    await supabase
      .from('sync_status')
      .update({
        progress,
        meta: message ? { current_step: message } : undefined
      })
      .eq('id', statusId);
  } catch (error) {
    console.warn('[GMB Sync] Failed to update progress', error);
  }
}
```

#### **C. إضافة Timeout Protection:**

```typescript
// في finalizeSyncStatusRecord
async function finalizeSyncStatusRecord(
  supabase: SupabaseServerClient,
  statusId: string | null,
  state: 'success' | 'failed' | 'cancelled',
  errorMessage?: string | null
) {
  if (!statusId) return;
  
  try {
    const updates: any = {
      status: state,
      finished_at: new Date().toISOString(),
      progress: state === 'success' ? 100 : undefined,
    };
    
    if (errorMessage) {
      updates.meta = { error: errorMessage };
    }
    
    await supabase
      .from('sync_status')
      .update(updates)
      .eq('id', statusId);
      
  } catch (error) {
    console.error('[GMB Sync] Failed to finalize sync status', error);
  }
}
```

#### **D. إضافة Cleanup Job (Cron):**

```typescript
// app/api/cron/cleanup-stuck-syncs/route.ts

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = await createClient();
  
  // Mark stuck syncs as failed (> 1 hour)
  const { data: stuckSyncs, error } = await supabase
    .from('sync_status')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      meta: { error: 'Sync timeout - automatically marked as failed' }
    })
    .eq('status', 'running')
    .lt('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .select('id, user_id, started_at');
  
  return NextResponse.json({
    success: true,
    cleaned: stuckSyncs?.length || 0,
    syncs: stuckSyncs
  });
}
```

---

## 📝 **خطوات التطبيق:**

### **1. تنظيف فوري:**
```bash
# نفذ في Supabase Dashboard:
# FIX_STUCK_SYNCS.sql
```

### **2. تطبيق Code Fixes:**
```bash
# 1. حدّث app/api/gmb/sync/route.ts
# 2. أضف updateSyncProgress helper
# 3. حسّن finalizeSyncStatusRecord
# 4. أضف cleanup cron job
```

### **3. اختبار:**
```bash
# 1. جرب Sync جديد
# 2. تأكد من progress updates
# 3. تأكد من status يتحدث (success/failed)
# 4. جرب error scenarios
```

---

## ✅ **النتيجة المتوقعة:**

### **قبل:**
```json
{
  "status": "running",  // ❌ عالق
  "progress": 0,        // ❌ لا يتحرك
  "started_at": "...",
  "finished_at": null   // ❌ لا ينتهي
}
```

### **بعد:**
```json
{
  "status": "success",  // ✅ أو "failed"
  "progress": 100,      // ✅ يتحدث
  "started_at": "...",
  "finished_at": "..."  // ✅ ينتهي
}
```

---

**الخطوة التالية:**
1. نفذ `FIX_STUCK_SYNCS.sql` لتنظيف الـ stuck syncs
2. جرب Sync جديد
3. إذا نفس المشكلة، نطبق الـ Code Fixes

