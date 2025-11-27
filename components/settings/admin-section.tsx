"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdminCheck } from "@/hooks/use-admin-check";
import { Activity, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminSection() {
  const { isAdmin, isLoading } = useAdminCheck();
  const router = useRouter();

  // Don't render anything if not admin or still loading
  if (!isAdmin || isLoading) {
    return null;
  }

  const handleDiagnosticsClick = () => {
    router.push("/owner-diagnostics");
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Shield className="h-5 w-5" />
          System Administration
        </CardTitle>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          Advanced tools and diagnostics for system owners
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleDiagnosticsClick}
            variant="outline"
            className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/20"
          >
            <Activity className="mr-2 h-4 w-4" />
            System Diagnostics
          </Button>

          {/* Future admin tools can be added here */}
          {/*
          <Button
            variant="outline"
            className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin Panel
          </Button>
          */}
        </div>

        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
          🔒 These tools are only visible to system administrators
        </p>
      </CardContent>
    </Card>
  );
}
