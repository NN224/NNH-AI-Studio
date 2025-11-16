# 🛠️ Development Tools Guide

أدوات التطوير المثبتة في المشروع

---

## 📦 الأدوات المثبتة

### 1. **React Query** ✅
**الاستخدام:** إدارة البيانات و API Calls

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'

// Example: Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['reviews'],
  queryFn: fetchReviews,
})

// Example: Mutate data
const mutation = useMutation({
  mutationFn: createReview,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reviews'] })
  },
})
```

**الميزات:**
- ✅ Automatic caching (5 minutes)
- ✅ Auto-retry with exponential backoff (3 attempts)
- ✅ Background refetching
- ✅ DevTools في Development mode

**DevTools:**
- يظهر تلقائياً في Development
- موقعه: أسفل الشاشة
- يعرض: Queries, Mutations, Cache

---

### 2. **Bundle Analyzer** ✅
**الاستخدام:** تحليل حجم الملفات

```bash
# تشغيل التحليل
npm run build:analyze

# سيفتح في المتصفح تلقائياً
# يعرض: حجم كل package و dependency
```

**الفوائد:**
- ✅ معرفة أكبر الملفات
- ✅ اكتشاف Dependencies الثقيلة
- ✅ تحسين Bundle Size
- ✅ Lazy Loading الذكي

**متى تستخدمه:**
- قبل كل Production Deploy
- عند إضافة dependency جديدة
- عند ملاحظة بطء في التحميل

---

### 3. **Sentry** ✅
**الاستخدام:** تتبع الأخطاء في Production

**الإعداد:**
1. أضف `NEXT_PUBLIC_SENTRY_DSN` في `.env.local`
2. احصل على DSN من [sentry.io](https://sentry.io)
3. Sentry سيعمل تلقائياً في Production

```bash
# في .env.local
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

**الميزات:**
- ✅ Error Tracking (Client & Server)
- ✅ Performance Monitoring
- ✅ Session Replay
- ✅ Alerts فورية

**ملاحظة:** معطّل في Development لتجنب الضوضاء

---

### 4. **Vercel Analytics** ✅
**الاستخدام:** تحليل الزوار

**مثبت في:** `app/layout.tsx`

```typescript
import { Analytics } from '@vercel/analytics/react'
```

**البيانات المتاحة:**
- Visitors Count
- Page Views
- Bounce Rate
- Top Pages

---

### 5. **Speed Insights** ✅
**الاستخدام:** مراقبة الأداء

**مثبت في:** `app/layout.tsx`

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next'
```

**البيانات المتاحة:**
- Core Web Vitals (LCP, FID, CLS)
- P75, P90, P95, P99 metrics
- Real User Metrics (RUM)

---

## 🚀 كيفية الاستخدام

### Development Mode:
```bash
npm run dev
# React Query DevTools: أسفل الشاشة
# Sentry: معطّل
```

### Production Build:
```bash
npm run build
# Sentry: مفعّل (إذا كان DSN موجود)
# Analytics: مفعّل
```

### Bundle Analysis:
```bash
npm run build:analyze
# سيفتح في المتصفح
```

---

## 📊 React Query Configuration

**الإعدادات الحالية:**
- `staleTime`: 5 minutes (البيانات تعتبر fresh)
- `gcTime`: 10 minutes (البيانات تبقى في cache)
- `retry`: 3 attempts (مع exponential backoff)
- `refetchOnWindowFocus`: Production only
- `refetchOnMount`: false (لا تعيد fetch إذا البيانات fresh)

**تعديل الإعدادات:**
عدّل في `app/providers.tsx`

---

## 🔧 Troubleshooting

### React Query DevTools لا يظهر:
- تأكد أنك في Development mode
- افتح Console وشوف الأخطاء

### Bundle Analyzer لا يفتح:
```bash
# جرب
ANALYZE=true npm run build
```

### Sentry لا يعمل:
- تأكد من `NEXT_PUBLIC_SENTRY_DSN` في `.env.local`
- تأكد أنك في Production mode

---

## 📝 Best Practices

### React Query:
```typescript
// ✅ استخدم queryKey واضح
queryKey: ['reviews', locationId, filters]

// ✅ استخدم invalidateQueries بعد mutations
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['reviews'] })
}

// ✅ استخدم optimistic updates
onMutate: async (newReview) => {
  await queryClient.cancelQueries({ queryKey: ['reviews'] })
  const previousReviews = queryClient.getQueryData(['reviews'])
  queryClient.setQueryData(['reviews'], (old) => [...old, newReview])
  return { previousReviews }
}
```

### Bundle Size:
```typescript
// ✅ استخدم dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'))

// ✅ استخدم tree shaking
import { specific } from 'library' // بدل import * as all
```

---

## 🎯 Next Steps

بعد تثبيت الأدوات:
1. ✅ استخدم React Query في Dashboard
2. ✅ راقب Bundle Size
3. ✅ فعّل Sentry قبل Production
4. ✅ راقب Analytics بعد الإطلاق

---

**جاهز للتطوير! 🚀**

