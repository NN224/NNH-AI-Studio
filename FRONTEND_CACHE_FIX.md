# 🔧 **إصلاح Frontend Cache للـ Average Rating**

---

## 🔍 **المشكلة:**

```
❌ Dashboard يعرض Average Rating = 0.0
✅ Reviews Page يعرض Average Rating = 4.7
✅ v_dashboard_stats View صحيح
```

**السبب المحتمل:**
```typescript
// React Query Cache قديم
staleTime: 5 * 60 * 1000, // 5 دقائق
```

---

## 🚀 **الحل السريع (من المتصفح):**

### **Option 1: Hard Refresh**
```
1. افتح Dashboard
2. اضغط Cmd+Shift+R (Mac) أو Ctrl+Shift+R (Windows)
3. أو افتح DevTools → Application → Clear Storage → Clear site data
```

### **Option 2: Clear React Query Cache**
```javascript
// في Console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### **Option 3: استخدم Refresh Button**
```
1. Dashboard → اضغط زر "Refresh" ⟳
2. انتظر حتى يتم التحديث
3. تحقق من Average Rating
```

---

## 🔧 **الحل الدائم (Code Fix):**

### **1. تقليل staleTime للـ Dashboard Stats:**

```typescript
// app/[locale]/(dashboard)/dashboard/NewDashboardClient.tsx

const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
  queryKey: ['dashboardStats'],
  queryFn: () => getDashboardStats(),
  staleTime: 1 * 60 * 1000, // ✅ تقليل من 5 دقائق إلى 1 دقيقة
  refetchOnWindowFocus: true, // ✅ إضافة: refetch عند العودة للـ tab
  refetchOnMount: true, // ✅ إضافة: refetch عند mount
});
```

### **2. إضافة Invalidation بعد Sync:**

```typescript
// components/gmb/gmb-connection-manager.tsx

const handleSync = async (accountId: string, isAutoSync = false) => {
  setSyncing(accountId);
  try {
    const response = await fetch('/api/gmb/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, syncType: 'full' }),
    });

    if (!response.ok) {
      // ... error handling
    }

    const data = await response.json();
    
    // ✅ إضافة: Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    queryClient.invalidateQueries({ queryKey: ['performanceChartData'] });
    queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    
    toast({
      title: isAutoSync ? 'Auto-Sync Complete!' : 'Sync Successful!',
      description: `Synced ${data.counts?.locations || 0} locations, ${data.counts?.reviews || 0} reviews.`,
    });
    
    await fetchAccounts();
  } catch (error: any) {
    // ... error handling
  } finally {
    setSyncing(null);
  }
};
```

### **3. إضافة Manual Refresh للـ Stats:**

```typescript
// app/[locale]/(dashboard)/dashboard/NewDashboardClient.tsx

const handleRefresh = async () => {
  toast.promise(
    Promise.all([
      refetchStats(),
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }),
      queryClient.invalidateQueries({ queryKey: ['performanceChartData'] }),
    ]),
    {
      loading: 'Refreshing dashboard...',
      success: 'Dashboard updated!',
      error: 'Failed to refresh',
    }
  );
};
```

---

## 📝 **التطبيق:**

### **الآن (Quick Fix):**
```
1. افتح Dashboard
2. Cmd+Shift+R (Hard Refresh)
3. تحقق من Average Rating
```

### **بعدين (Permanent Fix):**
```
1. أطبق التعديلات أعلاه
2. Commit & Push
3. Deploy
```

---

## ✅ **النتيجة المتوقعة:**

```
✅ Average Rating = 4.7 (بدلاً من 0.0)
✅ Cache يتحدث تلقائياً بعد Sync
✅ Refresh Button يعمل بشكل صحيح
```

---

**الخطوة التالية:**
1. نفذ `QUICK_FIX_SQL.sql` في Supabase
2. أرسل النتائج
3. جرب Hard Refresh في المتصفح
4. أخبرني إذا Average Rating اتصلح

