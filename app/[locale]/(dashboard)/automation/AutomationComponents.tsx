'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

export interface AutomationSettingsSummary {
  id: string
  locationId: string
  locationName: string
  isEnabled: boolean
  autoReplyEnabled: boolean
  autoReplyMinRating: number | null
  replyTone: string | null
  smartPostingEnabled: boolean
  postFrequency: number | null
  postDays: unknown
  postTimes: unknown
  contentPreferences: Record<string, unknown> | null
  competitorMonitoringEnabled: boolean
  insightsReportsEnabled: boolean
  reportFrequency: string | null
  createdAt: string
  updatedAt: string
}

export interface AutomationLogEntry {
  id: string
  locationId: string | null
  locationName: string
  actionType: string | null
  status: string | null
  details: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
}

type AutomationStatsCardProps = Readonly<{
  title: string
  value: string | number
  icon: string
  color: 'green' | 'orange' | 'blue' | 'purple'
}>

export function AutomationStatsCard({
  title,
  value,
  icon,
  color
}: AutomationStatsCardProps) {
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

type Template = Readonly<{
  name: string
  description: string
  icon: string
  type: 'auto_reply' | 'auto_answer' | 'scheduled_post' | 'alert' | 'report'
}>

export function AutomationTemplates() {
  const t = useTranslations('Automation.templates');
  const templates: ReadonlyArray<Template> = [
    {
      name: t('autoReply'),
      description: t('autoReplyDesc'),
      icon: '⭐',
      type: 'auto_reply'
    },
    {
      name: t('negativeAlert'),
      description: t('negativeAlertDesc'),
      icon: '🔔',
      type: 'alert'
    },
    {
      name: t('autoAnswer'),
      description: t('autoAnswerDesc'),
      icon: '❓',
      type: 'auto_answer'
    },
    {
      name: t('scheduledPosts'),
      description: t('scheduledPostsDesc'),
      icon: '📝',
      type: 'scheduled_post'
    },
    {
      name: t('weeklyReports'),
      description: t('weeklyReportsDesc'),
      icon: '📊',
      type: 'report'
    }
  ]

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">
        🚀 {t('title')}
      </h2>
      <p className="text-sm text-zinc-400 mb-4">
        {t('description')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {templates.map((template) => (
          <button
            key={template.type}
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

interface AutomationLocationCardProps {
  settings: AutomationSettingsSummary
  logs: ReadonlyArray<AutomationLogEntry>
}

export function AutomationLocationCard({ settings, logs }: AutomationLocationCardProps) {
  const t = useTranslations('Automation.locationCard');
  const [isExpanded, setIsExpanded] = useState(false)

  const { totalRuns, successRate, lastRun } = useMemo(() => {
    const total = logs.length
    const successes = logs.filter((log) => log.status === 'success').length
    const last = logs[0]?.createdAt ? new Date(logs[0].createdAt).toLocaleString() : null
    return {
      totalRuns: total,
      successRate: total > 0 ? Math.round((successes / total) * 100) : null,
      lastRun: last
    }
  }, [logs])

  const modules = useMemo(
    () => [
      { label: t('autoReply'), enabled: settings.autoReplyEnabled, icon: '🤖' },
      { label: t('smartPosting'), enabled: settings.smartPostingEnabled, icon: '📝' },
      { label: t('competitorMonitor'), enabled: settings.competitorMonitoringEnabled, icon: '📈' },
      { label: t('insightsReports'), enabled: settings.insightsReportsEnabled, icon: '📊' }
    ],
    [settings, t]
  )

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="text-3xl">{settings.isEnabled ? '⚡️' : '⏸️'}</div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">{settings.locationName}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    settings.isEnabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                  }`}
                >
                  {settings.isEnabled ? t('active') : t('paused')}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {t('updated')} {new Date(settings.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition text-white"
          >
            {isExpanded ? t('hideDetails') : t('showDetails')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <span>{t('lastRun')}</span>
            <span className="text-white">{lastRun ?? t('never')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{t('totalRuns')}</span>
            <span className="text-white">{totalRuns}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{t('successRate')}</span>
            <span className="text-white">
              {successRate !== null ? `${successRate}%` : 'n/a'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <span
              key={module.label}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                module.enabled
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}
            >
              <span>{module.icon}</span>
              <span>{module.label}</span>
            </span>
          ))}
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2 text-xs text-zinc-400">
              <h4 className="font-medium text-white flex items-center gap-2 text-sm">
                🤖 {t('autoReplies')}
              </h4>
              <p>{t('status')} {settings.autoReplyEnabled ? t('enabled') : t('disabled')}</p>
              <p>{t('minRating')} {settings.autoReplyMinRating ?? t('notSet')}</p>
              <p>{t('tone')} {settings.replyTone ?? t('default')}</p>
            </div>
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2 text-xs text-zinc-400">
              <h4 className="font-medium text-white flex items-center gap-2 text-sm">
                📝 {t('smartPosting')}
              </h4>
              <p>{t('status')} {settings.smartPostingEnabled ? t('enabled') : t('disabled')}</p>
              <p>{t('frequency')} {settings.postFrequency ?? t('notSet')}</p>
            </div>
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2 text-xs text-zinc-400">
              <h4 className="font-medium text-white flex items-center gap-2 text-sm">
                📊 {t('insightsMonitoring')}
              </h4>
              <p>
                {t('competitorMonitoring')}{' '}
                {settings.competitorMonitoringEnabled ? t('enabled') : t('disabled')}
              </p>
              <p>
                {t('insightsReports')}:{' '}
                {settings.insightsReportsEnabled ? t('enabled') : t('disabled')}
              </p>
              <p>{t('reportCadence')} {settings.reportFrequency ?? 'weekly'}</p>
            </div>
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2 text-xs text-zinc-400">
              <h4 className="font-medium text-white flex items-center gap-2 text-sm">
                ⚙️ {t('configuration')}
              </h4>
              <p>
                {t('configDescription')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ActivityLog({ logs }: Readonly<{ logs: ReadonlyArray<AutomationLogEntry> }>) {
  const t = useTranslations('Automation.activityLog');
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all')

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs
    return logs.filter((log) =>
      filter === 'success'
        ? log.status === 'success'
        : log.status && log.status !== 'success'
    )
  }, [filter, logs])

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          📋 {t('title')}
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
            {t('all')}
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {t('success')}
          </button>
          <button
            onClick={() => setFilter('failure')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === 'failure'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {t('failures')}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            {t('noLogsForFilter')}
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
                    {log.locationName}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.status === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {log.status ?? 'unknown'}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mb-1">
                  {log.actionType ?? 'Automation event'}
                  {log.errorMessage ? ` — ${log.errorMessage}` : ''}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {logs.length > 10 && (
        <div className="mt-4 text-center">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition text-white">
            {t('loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

