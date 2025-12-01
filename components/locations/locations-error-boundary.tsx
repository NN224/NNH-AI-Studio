"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, MapPin, Settings } from "lucide-react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

interface LocationsErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface LocationsErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retryAction?: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  section?: string;
}

class LocationsErrorBoundary extends React.Component<
  LocationsErrorBoundaryProps,
  LocationsErrorBoundaryState
> {
  constructor(props: LocationsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LocationsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    gmbLogger.error(
      `Locations Error (${this.props.section || "Unknown"})`,
      error,
      { errorInfo },
    );

    // Log error to external service if needed
    this.props.onError?.(error, errorInfo);

    // Show toast notification
    toast.error(
      `Error in ${this.props.section || "locations"}: ${error.message}`,
    );

    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            retryAction={this.handleRetry}
          />
        );
      }

      // Custom location-specific error UI
      return (
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">
                Error in {this.props.section || "Locations Section"}
              </CardTitle>
            </div>
            <CardDescription>{this.getErrorMessage()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.error && (
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm text-muted-foreground">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={this.handleRetry}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
              {this.props.section === "GMB Connection" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => (window.location.href = "/settings")}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Check Settings
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }

  private getErrorMessage(): string {
    const section = this.props.section?.toLowerCase() || "section";

    if (section.includes("gmb") || section.includes("connection")) {
      return "There was an issue connecting to Google My Business. Please check your account connection and try again.";
    }

    if (section.includes("location") || section.includes("card")) {
      return "Unable to load location data. This might be a temporary issue with the location service.";
    }

    if (section.includes("stats") || section.includes("analytics")) {
      return "Failed to load location statistics. The analytics service might be temporarily unavailable.";
    }

    if (section.includes("filter") || section.includes("search")) {
      return "Search and filtering functionality encountered an error. You can still browse locations manually.";
    }

    return "Something went wrong in this section. You can continue using other parts of the locations page.";
  }
}

// Wrapper component for easier usage
export function LocationsSection({
  children,
  section,
  fallback,
  className = "",
}: {
  children: React.ReactNode;
  section: string;
  fallback?: React.ComponentType<{ error?: Error; retryAction?: () => void }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <LocationsErrorBoundary
        section={section}
        fallback={fallback}
        onError={(error, errorInfo) => {
          // Enhanced logging for locations
          gmbLogger.error(`Locations section "${section}" error`, error, {
            errorInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          });
        }}
      >
        {children}
      </LocationsErrorBoundary>
    </div>
  );
}

// Specific fallback components for different sections
export const GMBConnectionErrorFallback = ({
  error,
  retryAction,
}: {
  error?: Error;
  retryAction?: () => void;
}) => (
  <Card className="border-destructive/50 bg-destructive/5">
    <CardContent className="p-8 text-center">
      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <MapPin className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-destructive mb-2">
        Google My Business Connection Error
      </h3>
      <p className="text-muted-foreground mb-4">
        Unable to connect to Google My Business. Please check your account
        connection.
      </p>
      <div className="flex gap-2 justify-center">
        <Button onClick={retryAction} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Connection
        </Button>
        <Button onClick={() => (window.location.href = "/settings")} size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Check Settings
        </Button>
      </div>
    </CardContent>
  </Card>
);

export const LocationCardErrorFallback = ({
  error,
  retryAction,
}: {
  error?: Error;
  retryAction?: () => void;
}) => (
  <Card className="border-destructive/30">
    <CardContent className="p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
      <h4 className="font-medium text-destructive mb-2">
        Failed to Load Location
      </h4>
      <p className="text-sm text-muted-foreground mb-3">
        This location couldn't be loaded. This might be a temporary issue.
      </p>
      <Button onClick={retryAction} size="sm" variant="outline">
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
    </CardContent>
  </Card>
);

export default LocationsErrorBoundary;
