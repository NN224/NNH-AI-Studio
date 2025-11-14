'use client'

import { CheckCircle2, Circle, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'

interface ProfileCompletenessBreakdown {
  readonly basicsFilled: boolean
  readonly categoriesSet: boolean
  readonly featuresAdded: boolean
  readonly linksAdded: boolean
}

interface ProfileCompletenessCardProps {
  readonly completeness: number
  readonly breakdown?: ProfileCompletenessBreakdown
}

function getStatusLabel(isComplete: boolean, label: string): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {isComplete ? (
        <CheckCircle2 className="w-4 h-4 text-green-400" />
      ) : (
        <Circle className="w-4 h-4 text-orange-400" />
      )}
      <span className="text-zinc-400">{label}</span>
    </div>
  )
}

export function ProfileCompletenessCard({ completeness, breakdown }: ProfileCompletenessCardProps) {
  const getColor = () => {
    if (completeness >= 80) return 'bg-green-600'
    if (completeness >= 50) return 'bg-orange-600'
    return 'bg-red-600'
  }

  const getStatus = () => {
    if (completeness >= 80) return 'Great! Your profile is well optimized'
    if (completeness >= 50) return 'Good progress! Complete more to boost ranking'
    return 'Low completion. Add more information to improve visibility'
  }

  const getStatusIcon = () => {
    if (completeness >= 80) return <TrendingUp className="w-5 h-5 text-green-400" />
    if (completeness >= 50) return <TrendingUp className="w-5 h-5 text-orange-400" />
    return <AlertTriangle className="w-5 h-5 text-yellow-400" />
  }

  return (
    <div className="bg-gradient-to-r from-orange-950/30 to-zinc-900 border border-orange-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            Profile Completeness
          </h3>
          <p className="text-sm text-zinc-400 flex items-center gap-2 mt-1">
            {getStatusIcon()}
            {getStatus()}
          </p>
        </div>
        <div className="text-4xl font-bold text-white">{completeness}%</div>
      </div>

      <div className="relative w-full h-4 bg-zinc-800 rounded-full overflow-hidden" aria-hidden>
        <div className={`h-full ${getColor()} transition-all duration-500 rounded-full`} style={{ width: `${completeness}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {getStatusLabel(breakdown?.basicsFilled ?? false, 'Basic Info Complete')}
        {getStatusLabel(breakdown?.categoriesSet ?? false, 'Categories Set')}
        {getStatusLabel(breakdown?.featuresAdded ?? false, 'Features Added')}
        {getStatusLabel(breakdown?.linksAdded ?? false, 'Action Links Added')}
      </div>
    </div>
  )
}

