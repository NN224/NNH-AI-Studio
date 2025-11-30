# 🟡 MEDIUM PRIORITY: Fetch بدون Error Boundaries

> **الأولوية:** P2 - متوسط
> **الوقت المقدر:** 3 ساعات
> **المجال:** استقرار + UX

---

## 📋 ملخص المشكلة

**Issue ID:** MEDIUM-032
**Severity:** 🟡 MEDIUM - STABILITY
**Impact:** الصفحة بالكامل تتوقف عند خطأ واحد

---

## 🎯 المشكلة بالتفصيل

عدم وجود Error Boundaries حول الـ components:

1. خطأ في component واحد يوقف الصفحة كلها
2. المستخدم يرى شاشة بيضاء
3. لا توجد طريقة للـ recovery

---

## 📁 الملفات المتأثرة

```
components/dashboard/*.tsx
components/locations/*.tsx
components/reviews/*.tsx
```

---

## ✅ الحل المطلوب

### إنشاء Error Boundary Component

```typescript
// components/error-boundary/error-boundary.tsx
"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            This section failed to load. Please try refreshing the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### إنشاء Wrapper Components

```typescript
// components/error-boundary/with-error-boundary.tsx
import { ErrorBoundary } from "./error-boundary";
import { ComponentType, ReactNode } from "react";

interface WithErrorBoundaryOptions {
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={options.fallback} onError={options.onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

### استخدام Error Boundaries

```typescript
// app/[locale]/dashboard/page.tsx
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ErrorBoundary fallback={<CardSkeleton />}>
        <StatsCard />
      </ErrorBoundary>

      <ErrorBoundary fallback={<CardSkeleton />}>
        <RecentReviews />
      </ErrorBoundary>

      <ErrorBoundary fallback={<ChartSkeleton />}>
        <PerformanceChart />
      </ErrorBoundary>

      <ErrorBoundary fallback={<ListSkeleton />}>
        <ActivityFeed />
      </ErrorBoundary>
    </div>
  );
}
```

### Suspense مع Error Boundary

```typescript
// components/async-boundary.tsx
import { Suspense, ReactNode } from "react";
import { ErrorBoundary } from "./error-boundary";

interface AsyncBoundaryProps {
  children: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
}

export function AsyncBoundary({
  children,
  loading = <div>Loading...</div>,
  error,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={error}>
      <Suspense fallback={loading}>{children}</Suspense>
    </ErrorBoundary>
  );
}
```

---

## ✅ معايير القبول

- [ ] تم إنشاء `ErrorBoundary` component
- [ ] كل section في Dashboard محاط بـ Error Boundary
- [ ] خطأ في section واحد لا يوقف الباقي
- [ ] المستخدم يرى رسالة خطأ واضحة
- [ ] زر "Try again" يعمل

---

**Status:** 🔴 NOT STARTED
