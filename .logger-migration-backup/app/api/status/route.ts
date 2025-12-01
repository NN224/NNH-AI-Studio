import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.UPTIME_ROBOT_API_KEY) {
      return NextResponse.json(
        {
          error: "Uptime Robot API key not configured",
          services: getMockServices(),
        },
        { status: 200 },
      );
    }

    // Fetch from Uptime Robot
    const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        api_key: process.env.UPTIME_ROBOT_API_KEY,
        format: "json",
        logs: 0,
        response_times: 1,
        response_times_limit: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Uptime Robot API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.stat !== "ok") {
      throw new Error("Uptime Robot API returned error");
    }

    // Transform to our format
    const services = data.monitors.map((monitor: UptimeRobotMonitor) => ({
      name: monitor.friendly_name,
      status: getStatusFromMonitor(monitor.status),
      uptime: `${monitor.all_time_uptime_ratio}%`,
      responseTime: monitor.average_response_time
        ? `${monitor.average_response_time}ms`
        : "N/A",
      url: monitor.url,
    }));

    // Generate uptime history for last 90 days
    const uptimeHistory = generateUptimeHistory();

    // Get incidents (mock for now - can be from database)
    const incidents = getRecentIncidents();

    // Get maintenance schedule
    const maintenance = getMaintenanceSchedule();

    return NextResponse.json(
      {
        services,
        uptimeHistory,
        incidents,
        maintenance,
        lastUpdated: new Date().toISOString(),
        source: "uptime-robot",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Status API error:", error);

    // Return mock data on error
    return NextResponse.json(
      {
        error: "Failed to fetch status from Uptime Robot",
        services: getMockServices(),
        lastUpdated: new Date().toISOString(),
        source: "mock",
      },
      { status: 200 },
    );
  }
}

// Helper function to convert Uptime Robot status codes
function getStatusFromMonitor(
  status: number,
): "operational" | "degraded" | "outage" {
  // 0 = paused, 1 = not checked yet, 2 = up, 8 = seems down, 9 = down
  switch (status) {
    case 2:
      return "operational";
    case 8:
      return "degraded";
    case 9:
      return "outage";
    default:
      return "operational";
  }
}

// Mock services for fallback
function getMockServices() {
  return [
    {
      name: "API Services",
      status: "operational",
      uptime: "99.99%",
      responseTime: "45ms",
    },
    {
      name: "Database",
      status: "operational",
      uptime: "99.98%",
      responseTime: "12ms",
    },
    {
      name: "Website",
      status: "operational",
      uptime: "99.99%",
      responseTime: "120ms",
    },
  ];
}

// Generate 90 days uptime history
function generateUptimeHistory() {
  const days = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate uptime (99% chance of operational)
    const status =
      Math.random() > 0.01
        ? "operational"
        : Math.random() > 0.5
          ? "degraded"
          : "outage";

    days.push({
      date: date.toISOString().split("T")[0],
      status,
    });
  }

  return days;
}

// Get recent incidents
function getRecentIncidents() {
  return [
    {
      id: 1,
      title: "Scheduled Maintenance Completed",
      description:
        "Database optimization and security updates applied successfully.",
      status: "resolved",
      severity: "low",
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
      ).toISOString(),
      affectedServices: ["Database", "API Services"],
    },
    {
      id: 2,
      title: "Intermittent API Slowdown",
      description:
        "We identified and resolved a performance issue affecting API response times.",
      status: "resolved",
      severity: "medium",
      startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000,
      ).toISOString(),
      affectedServices: ["API Services"],
    },
  ];
}

// Get maintenance schedule
function getMaintenanceSchedule() {
  return [
    {
      id: 1,
      title: "Routine Database Maintenance",
      description:
        "We'll be performing routine database maintenance to improve performance.",
      scheduledFor: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      duration: "2 hours",
      affectedServices: ["Database", "API Services"],
      impact: "Minor performance degradation expected",
    },
  ];
}

// TypeScript interfaces
interface UptimeRobotMonitor {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
  all_time_uptime_ratio: string;
  average_response_time?: number;
}
