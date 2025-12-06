"use client";

/**
 * مكون ErrorBoundary لمعالجة الأخطاء بشكل آمن
 * يمنع انهيار التطبيق بالكامل عند حدوث خطأ في أحد المكونات
 * ويسمح للمستخدم بإعادة تحميل المكون المعطل
 */

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/utils/logger";
import { AlertCircle } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

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
    // تحديث الحالة عند حدوث خطأ
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // تسجيل الخطأ للمراجعة لاحقاً
    logger.error("Component error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  public resetError = () => {
    // إعادة تعيين الحالة للسماح بإعادة تقديم المكون
    this.setState({ hasError: false });
  };

  public render() {
    // إذا كان هناك خطأ، عرض واجهة المستخدم البديلة
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <h2 className="text-lg font-semibold mb-2">
              Something went wrong!
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              An error occurred while loading this content.
            </p>
            <Button onClick={this.resetError} variant="default">
              Try Again
            </Button>
          </div>
        )
      );
    }

    // بخلاف ذلك، عرض المكونات الفرعية كالمعتاد
    return this.props.children;
  }
}
