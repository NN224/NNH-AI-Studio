#!/usr/bin/env npx tsx

/**
 * 🏥 NNH-AI-Studio Health Check Script
 * Run: npx tsx scripts/health-check.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface CheckResult {
  endpoint: string;
  status: number | "ERROR";
  ok: boolean;
  message?: string;
  time?: number;
}

const endpoints = [
  // 🔒 Health & Status
  { path: "/api/health", name: "Health Check", requiresAuth: false },
  { path: "/api/status", name: "Status", requiresAuth: false },

  // 🔐 GMB Core
  { path: "/api/gmb/status", name: "GMB Status", requiresAuth: true },
  { path: "/api/gmb/accounts", name: "GMB Accounts", requiresAuth: true },
  { path: "/api/gmb/locations", name: "GMB Locations", requiresAuth: true },

  // ⭐ Reviews
  { path: "/api/reviews", name: "Reviews List", requiresAuth: true },
  {
    path: "/api/reviews/auto-reply",
    name: "Auto Reply Settings",
    requiresAuth: true,
  },
  { path: "/api/reviews/stats", name: "Reviews Stats", requiresAuth: true },

  // 📝 Posts
  { path: "/api/gmb/posts/list", name: "Posts List", requiresAuth: true },

  // ❓ Questions
  { path: "/api/gmb/questions", name: "Questions", requiresAuth: true },

  // 🤖 AI Services
  { path: "/api/ai/usage", name: "AI Usage", requiresAuth: true },
  {
    path: "/api/ai/activity-stats",
    name: "AI Activity Stats",
    requiresAuth: true,
  },

  // 📊 Dashboard
  {
    path: "/api/dashboard/overview",
    name: "Dashboard Overview",
    requiresAuth: true,
  },
  { path: "/api/dashboard/stats", name: "Dashboard Stats", requiresAuth: true },

  // 🔧 Diagnostics
  {
    path: "/api/diagnostics/database-health",
    name: "Database Health",
    requiresAuth: true,
  },
  {
    path: "/api/diagnostics/missing-tables",
    name: "Missing Tables",
    requiresAuth: true,
  },
  { path: "/api/health/database", name: "DB Health", requiresAuth: false },
];

async function checkEndpoint(
  endpoint: (typeof endpoints)[0],
): Promise<CheckResult> {
  const url = `${BASE_URL}${endpoint.path}`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Note: In real scenario, you'd need to pass auth cookies/tokens
    });

    const time = Date.now() - start;

    return {
      endpoint: endpoint.path,
      status: response.status,
      ok: response.ok || response.status === 401, // 401 is expected for auth endpoints
      message: response.ok ? "OK" : `${response.status} ${response.statusText}`,
      time,
    };
  } catch (error) {
    return {
      endpoint: endpoint.path,
      status: "ERROR",
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function runHealthCheck() {
  console.log("\n🏥 NNH-AI-Studio Health Check");
  console.log("═".repeat(60));
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log("═".repeat(60));

  const results: CheckResult[] = [];

  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);

    const icon = result.ok ? "✅" : result.status === 401 ? "🔐" : "❌";
    const timeStr = result.time ? `${result.time}ms` : "-";

    console.log(
      `${icon} ${endpoint.name.padEnd(25)} ${String(result.status).padEnd(6)} ${timeStr.padStart(8)}`,
    );
  }

  console.log("═".repeat(60));

  // Summary
  const passed = results.filter((r) => r.ok).length;
  const authRequired = results.filter((r) => r.status === 401).length;
  const failed = results.filter((r) => !r.ok && r.status !== 401).length;

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   🔐 Auth Required: ${authRequired}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log(`\n⚠️  Failed Endpoints:`);
    results
      .filter((r) => !r.ok && r.status !== 401)
      .forEach((r) => console.log(`   - ${r.endpoint}: ${r.message}`));
  }

  console.log("\n");

  return { passed, authRequired, failed, results };
}

runHealthCheck();
