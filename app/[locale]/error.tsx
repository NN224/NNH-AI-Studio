"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { logger } from "@/lib/utils/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Application error", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/nnh-logo.png"
            alt="NNH Logo"
            width={64}
            height={64}
            className="opacity-80"
          />
        </div>

        {/* Error Content */}
        <Card className="border border-destructive/30 glass-strong">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Something Went Wrong
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              An unexpected error occurred. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error.message && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive font-medium">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={reset}
                size="lg"
                className="gap-2 gradient-orange"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/home">
                  <Home className="w-5 h-5" />
                  Go to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
