'use client'

import { useState } from 'react'

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

// Stats Card Component
export function AutomationStatsCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string
  value: string | number
  icon: string
  color: 'green' | 'orange' | 'blue' | 'purple'
}) {
  const colorClasses = {
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400'
  }
  
  return (
    <div className={`bg-zinc-900/50 border rounded-xl p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
      <div className="text-sm text-zinc-400">{title}</div>
    </div>
  )
}

// Automation Templates Component
export function AutomationTemplates() {
  const templates = [
    {
      name: 'Auto-Reply to Reviews',
      description: 'Automatically respond to customer reviews',
      icon: '⭐',
      type: 'auto_reply'
    },
    {
      name: 'Negative Review Alert',
      description: 'Get notified about low-rated reviews',
      icon: '🔔',
      type: 'alert'
    },
    {
      name: 'Auto-Answer Questions',
      description: 'Automatically answer common questions',
      icon: '❓',
      type: 'auto_answer'
    },
    {
      name: 'Scheduled Posts',
      description: 'Automatically publish posts on schedule',
      icon: '📝',
      type: 'scheduled_post'
    },
    {
      name: 'Weekly Reports',
      description: 'Receive automated performance reports',
      icon: '📊',
      type: 'report'
    }
  ]
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">
        🚀 Quick Start Templates
      </h2>
      <p className="text-sm text-zinc-400 mb-4">
        Get started quickly with pre-configured automation templates
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {templates.map((template, index) => (
          <button
            key={index}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-orange-500 hover:bg-zinc-800 transition text-left group"
          >
            <div className="text-2xl mb-2">{template.icon}</div>
            <div className="font-medium text-white text-sm mb-1 group-hover:text-orange-400 transition">
              {template.name}
            </div>
            <div className="text-xs text-zinc-500">
              {template.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Automation Card Component
export function AutomationCard({ automation }: { automation: Automation }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const getStatusColor = () => {
    if (automation.status === 'active') return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (automation.status === 'paused') return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
  
  const getStatusIcon = () => {
    if (automation.status === 'active') return '●'
    if (automation.status === 'paused') return '⏸'
    return '○'
  }
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="text-4xl">{automation.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-white">
                  {automation.name}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor()}`}>
                  {getStatusIcon()} {automation.status.charAt(0).toUpperCase() + automation.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mb-3">
                {automation.description}
              </p>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Last Run:</span>
                  <span className="text-white">{automation.stats.lastRun || 'Never'}</span>
                </div>
                {automation.stats.nextRun && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Next Run:</span>
                    <span className="text-white">{automation.stats.nextRun}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Total Runs:</span>
                  <span className="text-white">{automation.stats.totalRuns.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Success Rate:</span>
                  <span className="text-green-400">{automation.stats.successRate}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition text-white"
            >
              {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
            </button>
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition text-white">
              ⚙️ Edit
            </button>
          </div>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trigger */}
              <div className="bg-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <h4 className="font-medium text-white">Trigger</h4>
                </div>
                <p className="text-sm text-zinc-400 mb-2">
                  {automation.trigger.description}
                </p>
                <div className="text-xs text-zinc-500">
                  Type: <span className="text-zinc-400">{automation.trigger.type}</span>
                </div>
              </div>
              
              {/* Action */}
              <div className="bg-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚡</span>
                  <h4 className="font-medium text-white">Action</h4>
                </div>
                <p className="text-sm text-zinc-400 mb-2">
                  {automation.action.description}
                </p>
                <div className="text-xs text-zinc-500">
                  Type: <span className="text-zinc-400">{automation.action.type}</span>
                </div>
              </div>
            </div>
            
            {/* Configuration Details */}
            <div className="bg-zinc-800/30 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Configuration</h4>
              <div className="text-xs text-zinc-400 space-y-3">
                <div>
                  <span className="text-zinc-500 block mb-1">Trigger Config:</span>
                  <pre className="bg-zinc-900/50 p-2 rounded border border-zinc-700 overflow-x-auto">
                    <code className="text-orange-400">
                      {JSON.stringify(automation.trigger.config, null, 2)}
                    </code>
                  </pre>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Action Config:</span>
                  <pre className="bg-zinc-900/50 p-2 rounded border border-zinc-700 overflow-x-auto">
                    <code className="text-orange-400">
                      {JSON.stringify(automation.action.config, null, 2)}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              {automation.status === 'active' ? (
                <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition text-white">
                  ⏸️ Pause
                </button>
              ) : (
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition text-white">
                  ▶️ Resume
                </button>
              )}
              <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition text-white">
                📋 Duplicate
              </button>
              <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg text-sm font-medium transition text-red-400">
                🗑️ Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Activity Log Component
export function ActivityLog({ logs }: { logs: AutomationLog[] }) {
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all')
  
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.status === filter)
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          📋 Activity Log
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setFilter('failure')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === 'failure'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Failures
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No logs found for this filter
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-4 p-4 rounded-lg border ${
                log.status === 'success'
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <div className={`text-xl ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {log.status === 'success' ? '✓' : '✗'}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white text-sm">
                    {log.automation_name}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.status === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mb-1">
                  {log.message}
                </p>
                <p className="text-xs text-zinc-500">
                  {log.executed_at}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      
      {logs.length > 10 && (
        <div className="mt-4 text-center">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition text-white">
            Load More Logs
          </button>
        </div>
      )}
    </div>
  )
}

