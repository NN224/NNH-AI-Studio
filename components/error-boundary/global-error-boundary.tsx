"use client";

/**
 * Global Error Boundary
 * Catches and handles errors across the entire application
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logger } from "@/lib/utils/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class GlobalErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    logger.error("Global Error Boundary caught an error", error, { errorInfo });

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log to Supabase error_logs table
    this.logErrorToDatabase(error, errorInfo);
  }

  async logErrorToDatabase(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await fetch("/api/error-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent:
            typeof window !== "undefined"
              ? window.navigator.userAgent
              : "unknown",
          url: typeof window !== "undefined" ? window.location.href : "unknown",
        }),
      });
    } catch (logError) {
      // Fail silently - don't break the error boundary
      logger.error(
        "Failed to log error to database",
        logError instanceof Error ? logError : new Error(String(logError)),
      );
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">حدث خطأ غير متوقع</CardTitle>
                  <CardDescription>
                    نعتذر عن الإزعاج. تم تسجيل المشكلة وسنعمل على حلها.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Details */}
              {this.state.error && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">تفاصيل الخطأ:</h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <code className="text-sm text-red-600 dark:text-red-400 break-all">
                      {this.state.error.message}
                    </code>
                  </div>
                </div>
              )}

              {/* Stack Trace (Development Only) */}
              {process.env.NODE_ENV === "development" &&
                this.state.error?.stack && (
                  <details className="space-y-2">
                    <summary className="cursor-pointer font-semibold text-sm hover:text-primary">
                      Stack Trace (للمطورين)
                    </summary>
                    <div className="p-4 bg-muted rounded-lg overflow-auto max-h-64">
                      <pre className="text-xs">
                        <code>{this.state.error.stack}</code>
                      </pre>
                    </div>
                  </details>
                )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  حاول مرة أخرى
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  إعادة تحميل الصفحة
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  العودة للرئيسية
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p>إذا استمرت المشكلة، يمكنك:</p>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>مسح ذاكرة التخزين المؤقت للمتصفح</li>
                  <li>تحديث المتصفح إلى أحدث إصدار</li>
                  <li>التواصل مع الدعم الفني</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Boundary Hook (for functional components)
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
