# خطة إصلاح أخطاء البيانات غير المحددة - NNH AI Studio

## 🔍 المشاكل الرئيسية

تم رصد عدة مشاكل في التطبيق تتعلق بالتعامل مع البيانات غير المحددة (null/undefined):

1. **خطأ `Cannot read properties of undefined (reading 'totalLocations')`**
   - يظهر عندما تحاول المكونات الوصول إلى خاصية `totalLocations` من كائن غير موجود

2. **خطأ `Cannot read properties of undefined (reading 'reviewTrendPct')`**
   - يظهر عندما تحاول المكونات الوصول إلى خاصية `reviewTrendPct` من كائن غير موجود

3. **شاشة "Something went wrong!"** في تبويب المراجعات
   - بسبب فشل المكون في معالجة البيانات الفارغة أو غير المتوقعة

4. **بيانات صفرية غير صحيحة** في العديد من التبويبات
   - تظهر قيم صفرية بدلاً من "غير متوفر" في بعض الحالات

## 🛠️ خطة الإصلاح

### 1. طبقة الحماية المركزية

#### 1.1 إنشاء ملف حماية البيانات

- **الملف**: `/lib/utils/data-guards.ts`
- **الأولوية**: مرتفعة
- **الوصف**: إنشاء دوال مساعدة للتعامل مع البيانات غير المحددة

```typescript
/**
 * دوال مساعدة للتعامل مع البيانات غير المحددة أو الفارغة
 * تضمن إرجاع قيم افتراضية آمنة بدلاً من التسبب بأخطاء
 */

/**
 * التحقق من وجود قيمة وإرجاع قيمة افتراضية إذا كانت القيمة غير محددة
 */
export function safeValue<T>(value: unknown, defaultValue: T): T {
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

/**
 * التحقق من صحة بيانات الإحصاءات وتوفير قيم افتراضية
 */
export interface SafeStats {
  totalLocations: number;
  reviewsCount: number;
  averageRating: number;
  responseRate: number;
  reviewTrendPct: number;
  totalViews: number;
  totalInteractions: number;
}

export function safeStats(data: unknown): SafeStats {
  const fallback: SafeStats = {
    totalLocations: 0,
    reviewsCount: 0,
    averageRating: 0.0,
    responseRate: 0,
    reviewTrendPct: 0,
    totalViews: 0,
    totalInteractions: 0,
  };

  if (!data || typeof data !== "object") return fallback;

  const stats = data as Partial<SafeStats>;

  return {
    totalLocations: safeValue(stats.totalLocations, 0),
    reviewsCount: safeValue(stats.reviewsCount, 0),
    averageRating: safeValue(stats.averageRating, 0.0),
    responseRate: safeValue(stats.responseRate, 0),
    reviewTrendPct: safeValue(stats.reviewTrendPct, 0),
    totalViews: safeValue(stats.totalViews, 0),
    totalInteractions: safeValue(stats.totalInteractions, 0),
  };
}

/**
 * التحقق من صحة بيانات المراجعات وتوفير قيم افتراضية
 */
export interface SafeReviewsData {
  totalReviews: number;
  pendingReviews: number;
  responseRate: number;
  avgRating: number;
  ratingTrend: number;
}

export function safeReviewsData(data: unknown): SafeReviewsData {
  const fallback: SafeReviewsData = {
    totalReviews: 0,
    pendingReviews: 0,
    responseRate: 0,
    avgRating: 0,
    ratingTrend: 0,
  };

  if (!data || typeof data !== "object") return fallback;

  const reviews = data as Partial<SafeReviewsData>;

  return {
    totalReviews: safeValue(reviews.totalReviews, 0),
    pendingReviews: safeValue(reviews.pendingReviews, 0),
    responseRate: safeValue(reviews.responseRate, 0),
    avgRating: safeValue(reviews.avgRating, 0),
    ratingTrend: safeValue(reviews.ratingTrend, 0),
  };
}
```

#### 1.2 إنشاء معالج استجابة واجهة برمجة التطبيقات

- **الملف**: `/lib/utils/api-response-handler.ts`
- **الأولوية**: مرتفعة
- **الوصف**: إنشاء دالة لتوحيد استجابات واجهات البرمجة مع معالجة الأخطاء

```typescript
import { NextResponse } from "next/server";
import { apiLogger } from "@/lib/utils/logger";

/**
 * دالة لمعالجة استجابات واجهات برمجة التطبيقات بشكل آمن
 * - تضمن دائماً إرجاع استجابة صالحة حتى في حالة الأخطاء
 * - توفر قيم افتراضية آمنة
 * - تسجيل الأخطاء بشكل منظم
 */
export async function safeApiHandler<T>(
  handler: () => Promise<T>,
  fallbackData: T,
  context: {
    apiName: string;
    userId?: string;
  },
): Promise<NextResponse<T | { error: string }>> {
  try {
    const result = await handler();
    return NextResponse.json(result || fallbackData);
  } catch (error) {
    apiLogger.error(
      `Error in ${context.apiName}`,
      error instanceof Error ? error : new Error(String(error)),
      { userId: context.userId },
    );

    // Return fallback data in production, error details in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(fallbackData);
    } else {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }
}
```

### 2. إصلاح واجهات برمجة التطبيقات

#### 2.1 إصلاح واجهة برمجة إحصاءات لوحة المعلومات

- **الملف**: `/app/api/dashboard/stats/route.ts`
- **الأولوية**: مرتفعة
- **التغييرات**: استخدام معالج الاستجابة الجديد وضمان توفير قيم افتراضية

```typescript
import { NextRequest } from "next/server";
import { getDashboardStats } from "@/server/actions/dashboard";
import { createClient } from "@/lib/supabase/server";
import { safeApiHandler } from "@/lib/utils/api-response-handler";
import { safeStats } from "@/lib/utils/data-guards";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return safeApiHandler(
    async () => {
      // التحقق من المستخدم
      if (!user) {
        throw new Error("Authentication required");
      }

      // الحصول على البيانات وتطبيق الحماية عليها
      const stats = await getDashboardStats();
      return safeStats(stats);
    },
    // قيمة افتراضية آمنة في حالة فشل الاستعلام
    safeStats({}),
    { apiName: "dashboard/stats", userId: user?.id },
  );
}
```

#### 2.2 إصلاح واجهة برمجة إحصاءات المراجعات

- **الملف**: `/app/api/reviews/stats/route.ts`
- **الأولوية**: مرتفعة
- **التغييرات**: استخدام معالج الاستجابة الجديد وضمان توفير قيم افتراضية

```typescript
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApiHandler } from "@/lib/utils/api-response-handler";
import { safeReviewsData } from "@/lib/utils/data-guards";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return safeApiHandler(
    async () => {
      // التحقق من المستخدم
      if (!user) {
        throw new Error("Unauthorized");
      }

      // الحصول على المراجعات من قاعدة البيانات
      const { data: reviews } = await supabase
        .from("gmb_reviews")
        .select(...)
        .eq("gmb_locations.user_id", user.id);

      // حساب الإحصاءات
      const total = reviews?.length || 0;
      const pending = reviews?.filter(...).length || 0;
      const responseRate = total > 0 ? Math.round((total - pending) / total * 100) : 0;

      const result = {
        total,
        pending,
        responseRate,
        avgRating: reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0,
        ratingTrend: 0,  // تحسب في منطق أكثر تعقيداً
      };

      return result;
    },
    // قيمة افتراضية آمنة في حالة فشل الاستعلام
    safeReviewsData({}),
    { apiName: "reviews/stats", userId: user?.id }
  );
}
```

### 3. تحديث المكونات

#### 3.1 تحديث مكون بطاقة الإحصاءات

- **الملف**: `/components/command-center/stats-card.tsx`
- **الأولوية**: مرتفعة
- **التغييرات**: إضافة فحص آمن لجميع الخصائص

```typescript
"use client";

import { motion } from "framer-motion";
import { Star, Clock, TrendingUp } from "lucide-react";
import { safeValue } from "@/lib/utils/data-guards";

export interface CommandCenterStats {
  rating?: number;
  ratingChange?: number;
  totalReviews?: number;
  pendingCount?: number;
  responseRate?: number;
  attentionCount?: number;
}

interface StatsCardProps {
  stats: CommandCenterStats;
}

export function StatsCard({ stats }: StatsCardProps) {
  // استخدام دالة safeValue لضمان قيم افتراضية آمنة
  const rating = safeValue(stats?.rating, 0).toFixed(1);
  const pendingCount = safeValue(stats?.pendingCount, 0);
  const responseRate = safeValue(stats?.responseRate, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3"
    >
      {/* Rating */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 text-center">
        <div className="flex items-center justify-center gap-1 text-yellow-400">
          <Star className="h-4 w-4 fill-yellow-400" />
          <span className="text-lg font-bold">{rating}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Rating</p>
      </div>

      {/* Pending Count */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 text-center">
        <div className="flex items-center justify-center gap-1 text-orange-400">
          <Clock className="h-4 w-4" />
          <span className="text-lg font-bold">{pendingCount}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Pending</p>
      </div>

      {/* Response Rate */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 text-center">
        <div className="flex items-center justify-center gap-1 text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span className="text-lg font-bold">{responseRate}%</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Response</p>
      </div>
    </motion.div>
  );
}
```

#### 3.2 تحديث مكون إحصاءات لوحة المعلومات

- **الملف**: `/components/dashboard/stats/OverviewStats.tsx`
- **الأولوية**: مرتفعة
- **التغييرات**: إضافة فحص آمن لجميع الخصائص

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick, Star, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeValue } from "@/lib/utils/data-guards";

interface OverviewStatsProps {
  data?: {
    totalViews?: number;
    totalInteractions?: number;
    averageRating?: number;
    responseRate?: number;
  };
  isLoading: boolean;
}

export function OverviewStats({ data, isLoading }: OverviewStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  // استخدام قيم افتراضية آمنة
  const totalViews = safeValue(data?.totalViews, 0);
  const totalInteractions = safeValue(data?.totalInteractions, 0);
  const averageRating = safeValue(data?.averageRating, 0);
  const responseRate = safeValue(data?.responseRate, 0);

  const stats = [
    {
      title: "Total Views",
      value: totalViews,
      icon: Eye,
      color: "text-blue-500",
    },
    {
      title: "Interactions",
      value: totalInteractions,
      icon: MousePointerClick,
      color: "text-purple-500",
    },
    {
      title: "Average Rating",
      value: typeof averageRating === 'number' ? averageRating.toFixed(1) : "0.0",
      icon: Star,
      color: "text-yellow-500",
    },
    {
      title: "Response Rate",
      value: `${responseRate}%`,
      icon: MessageSquare,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### 3.3 إضافة ErrorBoundary آمن

- **الملف**: `/components/ui/error-boundary.tsx`
- **الأولوية**: مرتفعة
- **الوصف**: مكون لمعالجة الأخطاء بشكل آمن والسماح للمستخدم بإعادة المحاولة

```typescript
"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { logger } from "@/lib/utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Component error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  public resetError = () => {
    this.setState({ hasError: false });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong!</h2>
          <Button onClick={this.resetError} variant="default">
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 3.4 تطبيق ErrorBoundary على صفحة المراجعات

- **الملف**: `/app/[locale]/(dashboard)/reviews/page.tsx`
- **الأولوية**: مرتفعة
- **الوصف**: تطبيق حدود الخطأ لمنع انهيار الصفحة بالكامل

```typescript
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ReviewsContent } from "@/components/reviews/reviews-content";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ReviewsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 4. تحسينات عامة

#### 4.1 تحديث مكون ErrorHandler المركزي

- **الملف**: `/lib/utils/error-handler.ts`
- **الأولوية**: متوسطة
- **الوصف**: تحسين معالجة الأخطاء العامة ودمج تسجيل الأخطاء

```typescript
import { logger, apiLogger } from "@/lib/utils/logger";

interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
}

/**
 * معالجة الاستثناءات بشكل آمن مع تسجيل وإرجاع قيمة افتراضية
 */
export async function safeTry<T>(
  fn: () => Promise<T> | T,
  fallback: T,
  context: ErrorContext = {},
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // تسجيل الخطأ بالتفاصيل
    (context.component ? logger : apiLogger).error(
      `Error in ${context.component || "API"}: ${context.operation || "operation"}`,
      errorObj,
      { userId: context.userId },
    );

    return fallback;
  }
}
```

#### 4.2 تطبيق احتياطي لحالة عدم وجود بيانات

- **الملف**: `/components/ui/empty-state.tsx`
- **الأولوية**: منخفضة
- **الوصف**: مكون موحد لعرض حالة عدم وجود البيانات

```typescript
import { ReactNode } from "react";
import { FileX, AlertCircle, Info, Search } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: "file" | "alert" | "info" | "search";
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon = "info",
  action,
  children
}: EmptyStateProps) {
  const icons = {
    file: <FileX className="h-12 w-12 text-zinc-400" />,
    alert: <AlertCircle className="h-12 w-12 text-amber-400" />,
    info: <Info className="h-12 w-12 text-blue-400" />,
    search: <Search className="h-12 w-12 text-zinc-400" />,
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-800/30 border border-zinc-700/30 rounded-lg">
      <div className="mb-4">
        {icons[icon]}
      </div>
      <h3 className="text-lg font-medium text-zinc-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-zinc-400 max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default" className="mt-2">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
```

## 🧪 خطة الاختبار

1. **اختبار الوحدة للدوال الجديدة**
   - تغطية جميع دوال الحماية في `data-guards.ts`
   - التأكد من التعامل الصحيح مع مختلف أنواع البيانات المدخلة

2. **اختبار التكامل لواجهات برمجة التطبيقات**
   - اختبار سلوك واجهات البرمجة المحدثة مع بيانات مختلفة
   - التأكد من إرجاع قيم افتراضية عند حدوث أخطاء

3. **اختبار واجهة المستخدم**
   - فحص سلوك المكونات مع بيانات كاملة
   - فحص سلوك المكونات مع بيانات فارغة
   - فحص سلوك المكونات مع بيانات غير صالحة

4. **سيناريوهات الاختبار المحددة**
   - مستخدم جديد بدون أي بيانات
   - مستخدم بموقع واحد بدون أي مراجعات
   - مستخدم بمواقع متعددة ومراجعات
   - فشل واجهات برمجة التطبيقات (محاكاة خطأ الشبكة)

## 📋 ملخص الإصلاحات

| المكون                 | الملف                                           | الإصلاحات                                         |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------- |
| طبقة الحماية           | `/lib/utils/data-guards.ts`                     | إنشاء دوال للتحقق من البيانات وتوفير قيم افتراضية |
| معالج واجهات البرمجة   | `/lib/utils/api-response-handler.ts`            | دالة موحدة لمعالجة الاستجابات والأخطاء            |
| إحصاءات لوحة المعلومات | `/app/api/dashboard/stats/route.ts`             | تطبيق الحماية وتوفير قيم افتراضية                 |
| إحصاءات المراجعات      | `/app/api/reviews/stats/route.ts`               | تطبيق الحماية وتوفير قيم افتراضية                 |
| بطاقة الإحصاءات        | `/components/command-center/stats-card.tsx`     | التحقق من البيانات وتوفير قيم افتراضية            |
| إحصاءات لوحة المعلومات | `/components/dashboard/stats/OverviewStats.tsx` | التحقق من البيانات وتوفير قيم افتراضية            |
| حدود الأخطاء           | `/components/ui/error-boundary.tsx`             | إنشاء مكون لمعالجة الأخطاء بشكل آمن               |
| صفحة المراجعات         | `/app/[locale]/(dashboard)/reviews/page.tsx`    | تطبيق حدود الأخطاء                                |
| معالجة الأخطاء         | `/lib/utils/error-handler.ts`                   | تحسين معالجة الأخطاء العامة                       |
| حالة فارغة             | `/components/ui/empty-state.tsx`                | مكون لعرض حالة عدم وجود البيانات                  |

## 🚀 الفوائد المتوقعة

1. **استقرار التطبيق** - سيعمل التطبيق بشكل صحيح حتى مع البيانات غير المكتملة
2. **تجربة مستخدم أفضل** - لن يرى المستخدمون شاشات خطأ أو صفحات فارغة
3. **سهولة التشخيص** - تسجيل أفضل للأخطاء وتتبعها
4. **تسهيل الصيانة** - نمط موحد للتعامل مع البيانات والأخطاء
5. **قابلية التوسع** - سهولة إضافة مكونات جديدة مع نفس الحماية

## 📝 ملاحظات إضافية

- الإصلاحات مصممة ليكون لها تأثير واسع على النظام بأكمله، بدلاً من إصلاحات محددة للصفحات
- التركيز على إنشاء حلول مركزية يمكن إعادة استخدامها
- تم تصميم الحلول لتكون متوافقة مع النهج الدفاعي في البرمجة
- الإصلاحات تحافظ على التوافق مع الكود الحالي دون تغييرات جذرية في الهيكل

بعد تطبيق هذه الإصلاحات، سيتم حل جميع مشكلات البيانات غير المحددة، وستعمل جميع التبويبات بشكل صحيح 100٪ حتى في حالة عدم وجود بيانات.
