# 🟡 MEDIUM PRIORITY: غياب Code Splitting

> ⚠️ **قبل البدء:** اقرأ `AI_AGENT_START_HERE.md` أولاً! اقرأ الملف المستهدف كاملاً قبل أي تعديل.

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 4 ساعات
> **المجال:** أداء

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-027
**Severity:** 🟡 MEDIUM - PERFORMANCE
**Impact:** Initial bundle كبير جداً

---

## 🎯 المشكلة بالتفصيل

عدم استخدام dynamic imports و lazy loading:

1. كل الكود يُحمَّل مرة واحدة
2. Initial page load بطيء
3. المستخدم ينتظر تحميل كود لا يحتاجه

---

## 📁 الملفات المتأثرة

```
components/locations/locations-map-tab.tsx  # Map library كبير
components/analytics/*.tsx                   # Charts libraries
components/ai/*.tsx                          # AI components
```

---

## ✅ الحل المطلوب

### قبل:

```typescript
// ❌ يُحمَّل مع الصفحة حتى لو لم يُستخدم
import { MapComponent } from "./map-component";
import { ChartComponent } from "./chart-component";
```

### بعد:

```typescript
// ✅ يُحمَّل فقط عند الحاجة
import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("./map-component").then((mod) => mod.MapComponent),
  {
    loading: () => <MapSkeleton />,
    ssr: false, // Maps don't work in SSR
  }
);

const ChartComponent = dynamic(
  () => import("./chart-component"),
  {
    loading: () => <ChartSkeleton />,
  }
);
```

### استخدام React.lazy مع Suspense

```typescript
import { lazy, Suspense } from "react";

const HeavyComponent = lazy(() => import("./heavy-component"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### تحديث next.config.mjs

```javascript
// next.config.mjs
const nextConfig = {
  // Enable bundle analyzer
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === "true") {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          reportFilename: isServer
            ? "../analyze/server.html"
            : "./analyze/client.html",
        }),
      );
    }
    return config;
  },
};
```

---

## 🔍 خطوات التنفيذ

```bash
# تحليل الـ bundle
ANALYZE=true npm run build

# ابحث عن imports كبيرة
grep -rn "import.*from" components/ | grep -E "chart|map|editor|pdf"
```

---

## ✅ معايير القبول

- [ ] Maps تُحمَّل dynamically
- [ ] Charts تُحمَّل dynamically
- [ ] Heavy components تستخدم lazy loading
- [ ] Initial bundle < 200KB
- [ ] Lighthouse Performance > 80

---

**Status:** 🔴 NOT STARTED
