# خطة إصلاح لوحة المعلومات - من الأسفل إلى الأعلى

## المرحلة 1: المكتبات المساعدة (الأساس)

### 1.1 إنشاء وظائف حماية البيانات

**الملف**: `/lib/utils/data-guards.ts`

```typescript
// دوال حماية البيانات الأساسية
export function safeValue<T>(value: unknown, defaultValue: T): T {
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

// حماية بيانات لوحة المعلومات
export interface DashboardData {
  kpis: {
    totalLocations: number;
    reviewTrendPct: number;
    responseRate: number;
  };
  stats: {
    total: number;
    pending: number;
    completed: number;
  };
}

export function safeDashboardData(data: unknown): DashboardData {
  const defaultData: DashboardData = {
    kpis: {
      totalLocations: 0,
      reviewTrendPct: 0,
      responseRate: 0,
    },
    stats: {
      total: 0,
      pending: 0,
      completed: 0,
    },
  };

  if (!data || typeof data !== "object") return defaultData;
  const input = data as Partial<DashboardData>;

  return {
    kpis: {
      totalLocations: safeValue(input.kpis?.totalLocations, 0),
      reviewTrendPct: safeValue(input.kpis?.reviewTrendPct, 0),
      responseRate: safeValue(input.kpis?.responseRate, 0),
    },
    stats: {
      total: safeValue(input.stats?.total, 0),
      pending: safeValue(input.stats?.pending, 0),
      completed: safeValue(input.stats?.completed, 0),
    },
  };
}
```

### 1.2 معالج استجابة API موحد

**الملف**: `/lib/utils/api-response-handler.ts`

```typescript
import { NextResponse } from "next/server";
import { apiLogger } from "@/lib/utils/logger";

export async function safeApiHandler<T>(
  handler: () => Promise<T>,
  fallbackData: T,
  context: { apiName: string },
): Promise<NextResponse> {
  try {
    const result = await handler();
    return NextResponse.json(result || fallbackData);
  } catch (error) {
    apiLogger.error(`Error in ${context.apiName}`, error);
    return NextResponse.json(fallbackData);
  }
}
```

## المرحلة 2: وظائف الاستدعاء (Hooks)

### 2.1 تحديث وظيفة استدعاء البيانات

**الملف**: `/hooks/use-dashboard-cache.ts`

```typescript
import { safeDashboardData } from "@/lib/utils/data-guards";

export function useDashboardSnapshot() {
  const { data, error } = useSWR("/api/dashboard/overview", async (url) => {
    const response = await fetch(url);
    const rawData = await response.json();
    return safeDashboardData(rawData);
  });

  return {
    data: data || safeDashboardData({}),
    error,
    loading: !data && !error,
  };
}
```

### 2.2 تحديث وظيفة إحصاءات الأعمال

**الملف**: `/hooks/features/use-business-stats.ts`

```typescript
export function useBusinessStats() {
  const { data: rawData } = useQuery(["business-stats"], async () => {
    const response = await fetch("/api/dashboard/stats");
    return safeDashboardData(await response.json());
  });

  return {
    data: rawData || safeDashboardData({}),
    loading: !rawData,
  };
}
```

## المرحلة 3: واجهات برمجة التطبيقات (API)

### 3.1 تحديث واجهة إحصاءات لوحة المعلومات

**الملف**: `/app/api/dashboard/stats/route.ts`

```typescript
import { safeApiHandler } from "@/lib/utils/api-response-handler";
import { safeDashboardData } from "@/lib/utils/data-guards";

export async function GET() {
  return safeApiHandler(
    async () => {
      const stats = await getDashboardStats();
      return safeDashboardData(stats);
    },
    safeDashboardData({}),
    { apiName: "dashboard/stats" },
  );
}
```

### 3.2 تحديث واجهة نظرة عامة للوحة المعلومات

**الملف**: `/app/api/dashboard/overview/route.ts`

```typescript
export async function GET() {
  return safeApiHandler(
    async () => {
      const overview = await getOverviewData();
      return safeDashboardData(overview);
    },
    safeDashboardData({}),
    { apiName: "dashboard/overview" },
  );
}
```

## المرحلة 4: المكونات المشتركة

### 4.1 تحديث مكون بطاقة الإحصاءات

**الملف**: `/components/command-center/stats-card.tsx`

```typescript
interface StatsCardProps {
  data?: DashboardData;
}

export function StatsCard({ data }: StatsCardProps) {
  const safeData = safeDashboardData(data);

  return (
    <div>
      <div>Total: {safeData.stats.total}</div>
      <div>Response Rate: {safeData.kpis.responseRate}%</div>
      <div>Trend: {safeData.kpis.reviewTrendPct}%</div>
    </div>
  );
}
```

## المرحلة 5: صفحات التبويب

### 5.1 تحديث صفحة المراجعات

**الملف**: `/components/reviews/ReviewsPageClient.tsx`

```typescript
export function ReviewsPageClient() {
  const { data } = useDashboardSnapshot();
  const safeData = safeDashboardData(data);

  return (
    <ErrorBoundary>
      <div>
        <StatsCard data={safeData} />
        <ReviewsList data={safeData} />
      </div>
    </ErrorBoundary>
  );
}
```

## المرحلة 6: صفحات التطبيق

### 6.1 تحديث صفحة لوحة المعلومات الرئيسية

**الملف**: `/app/[locale]/(dashboard)/page.tsx`

```typescript
export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardProvider>
        <OverviewStats />
        <ReviewsSection />
        <AnalyticsSection />
      </DashboardProvider>
    </ErrorBoundary>
  );
}
```

## تسلسل التنفيذ:

1. **البدء بـ `data-guards.ts`**:
   - إنشاء جميع دوال الحماية
   - اختبارها بشكل مستقل

2. **تنفيذ `api-response-handler.ts`**:
   - إنشاء معالج API الموحد
   - اختباره مع حالات مختلفة

3. **تحديث الـ Hooks**:
   - تطبيق دوال الحماية في جميع وظائف الاستدعاء
   - التأكد من توفير قيم افتراضية

4. **تحديث واجهات API**:
   - تطبيق المعالج الموحد
   - استخدام دوال الحماية

5. **تحديث المكونات المشتركة**:
   - تطبيق التحققات الجديدة
   - استخدام ErrorBoundary

6. **تحديث صفحات التبويب**:
   - تطبيق التغييرات على كل صفحة
   - اختبار التكامل

## النتيجة المتوقعة:

- جميع البيانات محمية من القيم غير المحددة
- لا توجد أخطاء في واجهة المستخدم
- تجربة مستخدم مستقرة وموثوقة
