"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2 } from "lucide-react"

interface AICopilotStatusProps {
  status: "ready" | "processing"
  stats: {
    pending: number
    responseRate: number
    avgTime: number
  }
}

export function AICopilotStatus({ status, stats }: AICopilotStatusProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">AI Copilot</h3>
        <Badge
          variant={status === "ready" ? "default" : "secondary"}
          className={status === "ready" ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"}
        >
          {status === "ready" ? (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ready
            </>
          ) : (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Processing
            </>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
          <div className="text-xs text-muted-foreground mb-1">Pending</div>
          <div className="text-lg font-semibold text-foreground">{stats.pending}</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
          <div className="text-xs text-muted-foreground mb-1">Response Rate</div>
          <div className="text-lg font-semibold text-foreground">{stats.responseRate}%</div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
          <div className="text-xs text-muted-foreground mb-1">Avg. Time</div>
          <div className="text-lg font-semibold text-foreground">{stats.avgTime}h</div>
        </div>
      </div>
    </div>
  )
}

