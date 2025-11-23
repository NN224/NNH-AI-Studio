'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  [key: string]: unknown;
}

export default function OwnerDiagnosticsPage() {
  const [activeTab, setActiveTab] = useState('oauth');
  const [results, setResults] = useState<Record<string, DiagnosticResult | null>>({
    oauth: null,
    admin: null,
    db: null,
    syncQueue: null,
    dataCounts: null,
    cron: null,
    logs: null,
    apiHealth: null,
    integrity: null,
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({
    oauth: false,
    admin: false,
    db: false,
    syncQueue: false,
    dataCounts: false,
    cron: false,
    logs: false,
    apiHealth: false,
    integrity: false,
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
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [testKey]: false }));
    }
  };

  const diagnosticTabs = [
    {
      key: 'oauth',
      label: 'OAuth Connection',
      title: 'OAuth Connection Test',
      description: 'Test OAuth token validity and connection status',
      endpoint: '/api/diagnostics/oauth',
    },
    {
      key: 'admin',
      label: 'Admin Access',
      title: 'Admin Access Test',
      description: 'Verify admin client access and permissions',
      endpoint: '/api/diagnostics/admin',
    },
    {
      key: 'db',
      label: 'Database Health',
      title: 'Database Health Test',
      description: 'Check database connection and query performance',
      endpoint: '/api/diagnostics/db',
    },
    {
      key: 'syncQueue',
      label: 'Sync Queue',
      title: 'Sync Queue Test',
      description: 'Inspect sync queue status and pending items',
      endpoint: '/api/diagnostics/sync-queue',
    },
    {
      key: 'dataCounts',
      label: 'Data Sync Counts',
      title: 'Data Sync Counts',
      description: 'View synchronized data counts and statistics',
      endpoint: '/api/diagnostics/data-counts',
    },
    {
      key: 'cron',
      label: 'Worker/Cron Status',
      title: 'Worker / Cron Status',
      description: 'Check background worker and cron job status',
      endpoint: '/api/diagnostics/cron',
    },
    {
      key: 'logs',
      label: 'Sync Logs',
      title: 'Sync Logs',
      description: 'View recent synchronization logs and errors',
      endpoint: '/api/diagnostics/logs',
    },
    {
      key: 'apiHealth',
      label: 'API Health',
      title: 'API Health',
      description: 'Test API endpoints and response times',
      endpoint: '/api/diagnostics/api-health',
    },
    {
      key: 'integrity',
      label: 'Data Integrity',
      title: 'Data Integrity Check',
      description: 'Verify data consistency and relationships',
      endpoint: '/api/diagnostics/integrity',
    },
  ];

  return (
    <div className="container mx-auto pt-8 pb-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Owner Diagnostics</h1>
        <p className="text-muted-foreground">
          System diagnostics and health monitoring dashboard
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-5 gap-2 h-auto p-2">
          {diagnosticTabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
