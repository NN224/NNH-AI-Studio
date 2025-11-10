"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GMBConnectionManager } from "@/components/gmb/gmb-connection-manager"
import { Shield, Database, CheckCircle, AlertTriangle, Clock } from "lucide-react"

interface GMBAccount {
  id: string;
  account_name?: string;
  is_active: boolean;
  last_sync?: string;
}

interface AccountConnectionTabProps {
  gmbAccounts: GMBAccount[]
  onSuccess?: () => void
}

export function AccountConnectionTab({ gmbAccounts, onSuccess }: AccountConnectionTabProps) {
  const activeAccounts = gmbAccounts?.filter((a) => a && a.is_active) || []
  const hasActiveConnection = activeAccounts.length > 0

  return (
    <div className="space-y-6">
      {/* Connection Status Overview */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Account Connection Status
              </CardTitle>
              <CardDescription className="mt-2">
                Manage your Google My Business account connection
              </CardDescription>
            </div>
            <Badge 
              variant={hasActiveConnection ? "default" : "secondary"}
              className={hasActiveConnection ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
            >
              {hasActiveConnection ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Not Connected
                </div>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveConnection ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Connected Accounts</p>
                  <p className="text-2xl font-bold text-foreground">{activeAccounts.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Connection Health</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm text-green-400">Active & Healthy</p>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-2 pt-4 border-t border-primary/20">
                <p className="text-sm font-medium text-foreground">Account Details</p>
                <div className="space-y-2">
                  {activeAccounts.map((account) => (
                    <div 
                      key={account.id} 
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-primary/20"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {account.account_name || 'Google My Business Account'}
                        </p>
                        {account.last_sync && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Last synced: {new Date(account.last_sync).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                No active Google My Business connection found
              </p>
              <p className="text-xs text-muted-foreground">
                Connect your account below to start managing your GMB data
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GMB Connection Manager */}
      <GMBConnectionManager 
        variant="full"
        showLastSync={true}
        onSuccess={onSuccess}
      />

      {/* Security & Permissions */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security & Permissions
          </CardTitle>
          <CardDescription>
            Your connection is secure and encrypted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">OAuth 2.0 Authentication</p>
              <p className="text-xs text-muted-foreground">Industry-standard secure authentication</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Encrypted Token Storage</p>
              <p className="text-xs text-muted-foreground">All credentials are encrypted at rest</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Automatic Token Refresh</p>
              <p className="text-xs text-muted-foreground">Seamless reauthentication when needed</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Read-Only Access Option</p>
              <p className="text-xs text-muted-foreground">Control what data can be modified</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
