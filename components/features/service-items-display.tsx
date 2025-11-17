import { Scissors, DollarSign } from 'lucide-react';

type ServiceItem = {
  description?: string
  price?: { currencyCode: string; units: string }
  serviceType?: string
}

interface ServiceItemsDisplayProps {
  serviceItems?: ServiceItem[]
}

export function ServiceItemsDisplay({ serviceItems }: ServiceItemsDisplayProps) {
  if (!serviceItems || serviceItems.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Scissors className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">الخدمات المقدمة</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {serviceItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700 transition"
          >
            <div className="flex-1">
              <p className="text-white font-medium">
                {item.description || item.serviceType || 'خدمة'}
              </p>
              {item.serviceType && item.description !== item.serviceType && (
                <p className="text-xs text-zinc-500 mt-1">{item.serviceType}</p>
              )}
            </div>
            {item.price && (
              <div className="flex items-center gap-1 text-green-400 font-semibold ml-3">
                <DollarSign className="w-4 h-4" />
                <span>{item.price.units} {item.price.currencyCode}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

