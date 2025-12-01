"use client";

import React, { ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { logger } from "@/lib/utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean; // If true, errors won't propagate to parent boundaries
  showDetails?: boolean; // Show error details in development
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ComponentErrorBoundary extends React.Component<Props, State> {
  resetTimeoutId: number | null = null;
  previousResetKeys?: Array<string | number>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.previousResetKeys = props.resetKeys;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, isolate } = this.props;

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Log error in development
    if (process.env.NODE_ENV === "development") {
      logger.error("Component Error", error, { errorInfo });
    }

    // If not isolated, let error propagate to parent boundaries
    if (!isolate) {
      // Re-throw in next tick to allow state update first
      setTimeout(() => {
        throw error;
      }, 0);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys changed
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, idx) => key !== this.previousResetKeys?.[idx],
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any props change if enabled
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }

    this.previousResetKeys = resetKeys;
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    const { hasError, error } = this.state;
    const { fallback, children, showDetails = true } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Component Error</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>This component encountered an error and cannot be displayed.</p>

            {/* Show error details in development */}
            {showDetails && process.env.NODE_ENV === "development" && error && (
              <div className="mt-2 p-2 bg-zinc-900 rounded text-xs font-mono">
                {error.message}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={this.resetErrorBoundary}
              className="mt-2"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return children;
  }
}

/**
 * Hook to use error boundary functionality
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Throw error to nearest boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { resetError, captureError };
}
