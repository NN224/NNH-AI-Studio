'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true, 
      error,
      errorId 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Send error to logging service
    this.logErrorToService(error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In production, send to error tracking service (e.g., Sentry)
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            errorId: this.state.errorId,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
            url: typeof window !== 'undefined' ? window.location.href : null,
          }),
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const details = `
Error ID: ${errorId}
Message: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(details);
    toast.success('Error details copied to clipboard');
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-white">Something went wrong</CardTitle>
              <CardDescription className="text-zinc-400">
                An unexpected error occurred. The error has been logged and our team will investigate.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-mono text-red-400">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="text-xs text-zinc-400 overflow-x-auto max-h-40 overflow-y-auto">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}

              {/* Error ID for reference */}
              <div className="text-center">
                <p className="text-sm text-zinc-500">
                  Error ID: <code className="text-zinc-400">{this.state.errorId}</code>
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Reload Page
              </Button>

              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>

              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={this.copyErrorDetails}
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Copy Details
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
