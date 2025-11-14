import { Loader2 } from 'lucide-react'

export default function FeaturesLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-spin" />
        <div className="text-orange-500 text-xl font-medium">
          Loading Profile Settings...
        </div>
      </div>
    </div>
  )
}

