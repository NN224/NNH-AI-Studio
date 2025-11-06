'use client'

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

// Mock Data
const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Auto-Reply to Positive Reviews',
    description: 'Automatically respond to 4-5 star reviews with AI-generated replies',
    type: 'auto_reply',
    status: 'active',
    icon: '⭐',
    trigger: {
      type: 'new_review',
      description: 'When a new review with 4-5 stars is received',
      config: { rating: '>=4' }
    },
    action: {
      type: 'send_reply',
      description: 'Send AI-generated thank you message',
      config: { use_ai: true, tone: 'friendly', delay: 30 }
    },
    stats: {
      lastRun: '2 hours ago',
      totalRuns: 245,
      successRate: 98
    },
    created_at: '2025-10-15'
  },
  {
    id: '2',
    name: 'Negative Review Alert',
    description: 'Get instant notifications when receiving low-rated reviews',
    type: 'alert',
    status: 'active',
    icon: '🔔',
    trigger: {
      type: 'new_review',
      description: 'When a review with 1-2 stars is received',
      config: { rating: '<=2' }
    },
    action: {
      type: 'send_notification',
      description: 'Send email and Slack notification',
      config: { channels: ['email', 'slack'], priority: 'high' }
    },
    stats: {
      lastRun: '3 days ago',
      totalRuns: 12,
      successRate: 100
    },
    created_at: '2025-10-10'
  },
  {
    id: '3',
    name: 'Auto-Answer FAQ',
    description: 'Automatically answer common questions using AI',
    type: 'auto_answer',
    status: 'active',
    icon: '❓',
    trigger: {
      type: 'new_question',
      description: 'When a new question is posted',
      config: { keywords: ['hours', 'location', 'parking', 'menu'] }
    },
    action: {
      type: 'post_answer',
      description: 'Generate and post AI answer',
      config: { use_ai: true, use_faq: true }
    },
    stats: {
      lastRun: '5 minutes ago',
      totalRuns: 89,
      successRate: 95
    },
    created_at: '2025-10-20'
  },
  {
    id: '4',
    name: 'Weekly Performance Report',
    description: 'Receive automated weekly analytics summary via email',
    type: 'report',
    status: 'active',
    icon: '📊',
    trigger: {
      type: 'schedule',
      description: 'Every Monday at 9:00 AM',
      config: { cron: '0 9 * * 1' }
    },
    action: {
      type: 'send_report',
      description: 'Email performance summary',
      config: { format: 'email', metrics: ['reviews', 'impressions', 'engagement'] }
    },
    stats: {
      lastRun: '1 day ago',
      nextRun: 'in 6 days',
      totalRuns: 47,
      successRate: 100
    },
    created_at: '2025-09-01'
  },
  {
    id: '5',
    name: 'Monday Motivation Post',
    description: 'Auto-publish a motivational post every Monday',
    type: 'scheduled_post',
    status: 'paused',
    icon: '📝',
    trigger: {
      type: 'schedule',
      description: 'Every Monday at 10:00 AM',
      config: { cron: '0 10 * * 1' }
    },
    action: {
      type: 'publish_post',
      description: 'Create and publish GMB post',
      config: { type: 'whats_new', use_ai: true }
    },
    stats: {
      lastRun: '8 days ago',
      nextRun: 'Paused',
      totalRuns: 32,
      successRate: 94
    },
    created_at: '2025-08-15'
  }
]

const mockLogs: AutomationLog[] = [
  {
    id: '1',
    automation_id: '1',
    automation_name: 'Auto-Reply to Positive Reviews',
    status: 'success',
    message: 'Successfully sent reply to 5-star review',
    executed_at: '2 minutes ago'
  },
  {
    id: '2',
    automation_id: '3',
    automation_name: 'Auto-Answer FAQ',
    status: 'success',
    message: 'Posted answer to question about opening hours',
    executed_at: '5 minutes ago'
  },
  {
    id: '3',
    automation_id: '4',
    automation_name: 'Weekly Performance Report',
    status: 'success',
    message: 'Report sent to nabel@nnhstudio.com',
    executed_at: '1 hour ago'
  },
  {
    id: '4',
    automation_id: '2',
    automation_name: 'Negative Review Alert',
    status: 'failure',
    message: 'Failed to send Slack notification: API timeout',
    executed_at: '3 hours ago'
  }
]

export default function AutomationPage() {
  const activeAutomations = mockAutomations.filter(a => a.status === 'active')
  const pausedAutomations = mockAutomations.filter(a => a.status === 'paused')
  const totalRuns = mockAutomations.reduce((sum, a) => sum + a.stats.totalRuns, 0)
  
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
          
          <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition flex items-center gap-2 text-white">
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
