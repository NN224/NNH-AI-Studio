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

  return (
    <div className="space-y-6">
      {/* GMB Connection Manager - Main Component */}
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
