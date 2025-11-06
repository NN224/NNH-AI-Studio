'use client'

export function ProfileCompletenessCard({ completeness }: { completeness: number }) {
  const getColor = () => {
    if (completeness >= 80) return 'bg-green-600'
    if (completeness >= 50) return 'bg-orange-600'
    return 'bg-red-600'
  }
  
  const getStatus = () => {
    if (completeness >= 80) return '🎉 Great! Your profile is well optimized'
    if (completeness >= 50) return '👍 Good progress! Complete more to boost ranking'
    return '⚠️ Low completion. Add more information to improve visibility'
  }
  
  return (
    <div className="bg-gradient-to-r from-orange-950/30 to-zinc-900 border border-orange-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            📊 Profile Completeness
          </h3>
          <p className="text-sm text-zinc-400">
            {getStatus()}
          </p>
        </div>
        <div className="text-4xl font-bold text-white">
          {completeness}%
        </div>
      </div>
      
      <div className="relative w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-500 rounded-full`}
          style={{ width: `${completeness}%` }}
        />
      </div>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          <span className="text-zinc-400">Basic Info Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          <span className="text-zinc-400">Categories Set</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">○</span>
          <span className="text-zinc-400">Add More Features</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">○</span>
          <span className="text-zinc-400">Add Special Links</span>
        </div>
      </div>
    </div>
  )
}

