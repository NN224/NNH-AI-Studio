'use client'

import { useEffect } from 'react'
import { AutomationStatsCard, AutomationTemplates, AutomationCard, ActivityLog } from './AutomationComponents'

// Types
interface Automation {
  id: string
  name: string
  description: string
  type: 'auto_reply' | 'auto_answer' | 'scheduled_post' | 'alert' | 'report'
  status: 'active' | 'paused' | 'draft'
  icon: string
  
  trigger: {
    type: string
    description: string
    config: any
  }
  
  action: {
    type: string
    description: string
    config: any
  }
  
  stats: {
    lastRun?: string
    nextRun?: string
    totalRuns: number
    successRate: number
  }
  
  created_at: string
}

interface AutomationLog {
  id: string
  automation_id: string
  automation_name: string
  status: 'success' | 'failure'
  message: string
  executed_at: string
}

export default function AutomationPage() {
  // Since mock data removed, define empty arrays or default values
  const mockAutomations: Automation[] = []
  const mockLogs: AutomationLog[] = []

  const activeAutomations = mockAutomations.filter(a => a.status === 'active')
  const pausedAutomations = mockAutomations.filter(a => a.status === 'paused')
  const totalRuns = mockAutomations.reduce((sum, a) => sum + a.stats.totalRuns, 0)

  useEffect(() => {
    console.log('[AutomationPage] Loaded and listening for refresh')
  }, [])
  
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🤖 Automation Center
            </h1>
            <p className="text-zinc-400">
              Set up automated workflows to save time and improve efficiency
            </p>
          </div>
          
          <button
            onClick={() => {
              window.dispatchEvent(new Event('dashboard:refresh'));
              console.log('[AutomationPage] Create Automation clicked, dashboard refresh triggered');
            }}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition flex items-center gap-2 text-white"
          >
            ➕ Create Automation
          </button>
        </div>
        
        {/* API Notice */}
        <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">🚧</span>
          <div className="flex-1">
            <div className="font-medium text-orange-400 mb-1">
              Demo Mode - Automation Execution Coming in Phase 3
            </div>
            <div className="text-sm text-orange-300/70">
              This page shows the automation interface and configuration options. Actual execution of automated workflows will be available once backend integration is complete in Phase 3.
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AutomationStatsCard
            title="Active Automations"
            value={activeAutomations.length}
            icon="⚡"
            color="green"
          />
          <AutomationStatsCard
            title="Paused"
            value={pausedAutomations.length}
            icon="⏸️"
            color="orange"
          />
          <AutomationStatsCard
            title="Total Runs"
            value={totalRuns.toLocaleString()}
            icon="📊"
            color="blue"
          />
          <AutomationStatsCard
            title="Success Rate"
            value="97%"
            icon="✅"
            color="purple"
          />
        </div>
        
        {/* Quick Templates */}
        <AutomationTemplates />
        
        {/* Active Automations */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">
            Active Automations
          </h2>
          
          {mockAutomations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
            />
          ))}
        </div>
        
        {/* Activity Log */}
        <ActivityLog logs={mockLogs} />
        
      </div>
    </div>
  )
}
