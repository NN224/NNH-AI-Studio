'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/lib/navigation'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  section?: string // Optional section name for better error context
}

interface ErrorInfo {
  componentStack?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Granular error boundary for dashboard sections
 * Provides better error isolation and user experience
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    console.error('Dashboard section error:', {
      error: error.message,
      stack: error.stack,
      section: this.props.section || 'unknown',
      errorInfo,
      timestamp: new Date().toISOString(),
    })

    // Send to monitoring service (e.g., Sentry)
    const windowWithSentry = window as Window & {
      Sentry?: { captureException: (error: Error, context?: object) => void }
    }
    if (typeof window !== 'undefined' && windowWithSentry.Sentry) {
      windowWithSentry.Sentry.captureException(error, {
        extra: {
          ...errorInfo,
          section: this.props.section,
        },
      })
    }

    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {this.props.section ? `Error in ${this.props.section}` : 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {this.props.section
                ? `An error occurred in the ${this.props.section} section. The rest of the dashboard is still functional.`
                : 'We encountered an unexpected error. Please try refreshing the section.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs bg-muted p-3 rounded overflow-auto">
                <summary className="cursor-pointer font-medium mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * Convenience wrapper component for dashboard sections
 * Automatically wraps content with DashboardErrorBoundary
 */
interface DashboardSectionProps {
  children: ReactNode
  section?: string
  fallback?: ReactNode
}

export function DashboardSection({ children, section, fallback }: DashboardSectionProps) {
  return (
    <DashboardErrorBoundary section={section} fallback={fallback}>
      {children}
    </DashboardErrorBoundary>
  )
}
