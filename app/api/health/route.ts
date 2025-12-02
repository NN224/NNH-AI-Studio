import { NextRequest, NextResponse } from "next/server";
import { performHealthChecks } from "@/lib/services/monitoring-service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Main health check endpoint
 * Returns overall system health status
 */
export async function GET(request: NextRequest) {
  try {
    // Perform all health checks
    const healthChecks = await performHealthChecks();

    // Determine overall status
    const hasUnhealthy = healthChecks.some(
      (check) => check.status === "unhealthy",
    );
    const hasDegraded = healthChecks.some(
      (check) => check.status === "degraded",
    );

    const overallStatus = hasUnhealthy
      ? "unhealthy"
      : hasDegraded
        ? "degraded"
        : "healthy";
    const statusCode = overallStatus === "unhealthy" ? 503 : 200;

    // Get additional system info
    const systemInfo = await getSystemInfo();

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: healthChecks,
        system: systemInfo,
        summary: {
          healthy: healthChecks.filter((c) => c.status === "healthy").length,
          degraded: healthChecks.filter((c) => c.status === "degraded").length,
          unhealthy: healthChecks.filter((c) => c.status === "unhealthy")
            .length,
          total: healthChecks.length,
        },
      },
      { status: statusCode },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        message: String(error),
      },
      { status: 503 },
    );
  }
}

/**
 * Get system information
 */
async function getSystemInfo() {
  const info: Record<string, unknown> = {
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  // Get memory usage
  if (typeof process !== "undefined" && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    info.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      external: Math.round(memUsage.external / 1024 / 1024) + "MB",
    };
  }

  // Check database connection pool (if available)
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("gmb_locations")
      .select("*", { count: "exact", head: true });

    info.database = {
      connected: true,
      recordCount: count || 0,
    };
  } catch (error) {
    info.database = {
      connected: false,
      error: String(error),
    };
  }

  return info;
}

/**
 * Liveness probe endpoint (for Kubernetes/container orchestration)
 * Simple check that the application is running
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
