"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlayCircle } from "lucide-react";
import { useState } from "react";

interface DiagnosticResult {
  [key: string]: unknown;
}

export default function OwnerDiagnosticsPage() {
  const [activeTab, setActiveTab] = useState("oauth");
  const [results, setResults] = useState<
    Record<string, DiagnosticResult | null>
  >({
    oauth: null,
    oauthAdvanced: null,
    gmbApi: null,
    dataFreshness: null,
    aiHealth: null,
    admin: null,
    db: null,
    syncQueue: null,
    dataCounts: null,
    cron: null,
    logs: null,
    apiHealth: null,
    integrity: null,
    dataSyncCheck: null,
    syncDebug: null,
    missingTables: null,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({
    oauth: false,
    oauthAdvanced: false,
    gmbApi: false,
    dataFreshness: false,
    aiHealth: false,
    admin: false,
    db: false,
    syncQueue: false,
    dataCounts: false,
    cron: false,
    logs: false,
    apiHealth: false,
    integrity: false,
    dataSyncCheck: false,
    syncDebug: false,
    missingTables: false,
  });

  const runTest = async (testKey: string, endpoint: string) => {
    setLoading((prev) => ({ ...prev, [testKey]: true }));
    setResults((prev) => ({ ...prev, [testKey]: null }));

    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      setResults((prev) => ({ ...prev, [testKey]: data }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [testKey]: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [testKey]: false }));
    }
  };

  const diagnosticTabs = [
    // 🔐 GMB & OAuth Tests
    {
      key: "oauth",
      label: "OAuth & Token",
      title: "OAuth Connection & Token Validity",
      description: "Test OAuth token validity with real Google API call",
      endpoint: "/api/diagnostics/oauth",
      category: "gmb",
    },
    {
      key: "oauthAdvanced",
      label: "OAuth Advanced",
      title: "Advanced OAuth & Token Check",
      description:
        "Deep inspection of OAuth tokens, decryption, expiration, and refresh mechanism",
      endpoint: "/api/diagnostics/oauth-advanced",
      category: "gmb",
    },
    {
      key: "gmbApi",
      label: "GMB API",
      title: "GMB API Connectivity",
      description:
        "Test all GMB API endpoints (Accounts, Locations, Reviews, Questions, Posts, Media, Insights)",
      endpoint: "/api/diagnostics/gmb-api",
      category: "gmb",
    },

    // 🔄 Sync & Data Tests
    {
      key: "dataFreshness",
      label: "Data Freshness",
      title: "Data Freshness Check",
      description:
        "Verify how recent your synced data is and detect stale locations",
      endpoint: "/api/diagnostics/data-freshness",
      category: "sync",
    },
    {
      key: "syncQueue",
      label: "Sync Queue",
      title: "Sync Queue Status",
      description: "Inspect sync queue status and pending items",
      endpoint: "/api/diagnostics/sync-queue",
      category: "sync",
    },
    {
      key: "cron",
      label: "Worker/Cron",
      title: "Worker & Cron Jobs",
      description: "Check background worker and cron job status",
      endpoint: "/api/diagnostics/cron",
      category: "sync",
    },
    {
      key: "logs",
      label: "Sync Logs",
      title: "Sync Logs",
      description: "View recent synchronization logs and errors",
      endpoint: "/api/diagnostics/logs",
      category: "sync",
    },

    // 🤖 AI Tests
    {
      key: "aiHealth",
      label: "AI Health",
      title: "AI Providers & Features",
      description:
        "Test AI providers (Anthropic, OpenAI, Google, Groq) and features (Auto-Reply, Auto-Answer)",
      endpoint: "/api/diagnostics/ai-health",
      category: "ai",
    },

    // 💾 Database Tests
    {
      key: "db",
      label: "Database Health",
      title: "Database Health",
      description: "Check database connection and table status",
      endpoint: "/api/diagnostics/db",
      category: "database",
    },
    {
      key: "integrity",
      label: "Data Integrity",
      title: "Data Integrity",
      description: "Verify data consistency and relationships",
      endpoint: "/api/diagnostics/integrity",
      category: "database",
    },
    {
      key: "dataCounts",
      label: "Data Counts",
      title: "Data Sync Counts",
      description: "View synchronized data counts and statistics",
      endpoint: "/api/diagnostics/data-counts",
      category: "database",
    },

    // 🔧 System Tests
    {
      key: "admin",
      label: "Admin Access",
      title: "Admin Access",
      description: "Verify admin client access and permissions",
      endpoint: "/api/diagnostics/admin",
      category: "system",
    },
    {
      key: "apiHealth",
      label: "API Health",
      title: "API Health",
      description: "Test API endpoints and response times",
      endpoint: "/api/diagnostics/api-health",
      category: "system",
    },
    {
      key: "missingTables",
      label: "Missing Tables",
      title: "Database Schema Check",
      description: "Check for missing database tables and generate SQL",
      endpoint: "/api/diagnostics/missing-tables",
      category: "database",
    },
  ];

  return (
    <div className="container mx-auto pt-8 pb-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          🔬 Production Readiness Diagnostics
        </h1>
        <p className="text-muted-foreground">
          Comprehensive system health checks for Google My Business integration
        </p>
        <div className="flex gap-2 text-sm">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
            🔐 GMB & OAuth (2)
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
            🔄 Sync & Data (5)
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
            🤖 AI (1)
          </span>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
            💾 Database (5)
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
            🔧 System (2)
          </span>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 h-auto p-2">
          {diagnosticTabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {diagnosticTabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{tab.title}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => runTest(tab.key, tab.endpoint)}
                    disabled={loading[tab.key]}
                    className="w-full sm:w-auto"
                  >
                    {loading[tab.key] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Run Test
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Test Results</h3>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                        {results[tab.key]
                          ? JSON.stringify(results[tab.key], null, 2)
                          : '// No results yet. Click "Run Test" to execute diagnostics.'}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
