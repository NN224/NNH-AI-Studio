'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cacheUtils } from '@/hooks/use-dashboard-cache'

export function QuickActionButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSyncAll = () => {
    // Old sync removed - redirect to use global sync button
    toast.info('Please use the global sync button in the header')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all duration-300 ease-in-out"
      onClick={handleSyncAll}
      disabled={loading}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing...
        </span>
      ) : (
        '🔄 Sync All'
      )}
    </Button>
  )
}
