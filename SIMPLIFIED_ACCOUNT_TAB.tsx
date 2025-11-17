"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GMBConnectionManager } from "@/components/gmb/gmb-connection-manager"
import { Shield, CheckCircle } from "lucide-react"

interface AccountConnectionTabProps {
  gmbAccounts: any[]
  onSuccess?: () => void
}

export function AccountConnectionTab({ gmbAccounts, onSuccess }: AccountConnectionTabProps) {
  const activeAccounts = gmbAccounts?.filter((a) => a && a.is_active) || []
  const hasActiveConnection = activeAccounts.length > 0

  return (
    <div className="space-y-6">
      {/* GMB Connection Only - No duplication */}
      <GMBConnectionManager 
        variant="full"
        showLastSync={true}
        onSuccess={onSuccess}
      />

      {/* Simple Security Info */}
      <Card className="bg-card/50 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              OAuth 2.0 Secure Authentication
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Encrypted Token Storage
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Automatic Token Refresh
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
