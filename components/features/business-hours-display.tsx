import { Clock, Calendar } from 'lucide-react';

type BusinessHours = {
  monday?: { open: string; close: string; closed: boolean }
  tuesday?: { open: string; close: string; closed: boolean }
  wednesday?: { open: string; close: string; closed: boolean }
  thursday?: { open: string; close: string; closed: boolean }
  friday?: { open: string; close: string; closed: boolean }
  saturday?: { open: string; close: string; closed: boolean }
  sunday?: { open: string; close: string; closed: boolean }
}

type MoreHoursType = {
  hoursTypeId: string
  displayName: string
  periods: Array<{
    openDay: string
    openTime: string
    closeDay: string
    closeTime: string
  }>
}

interface BusinessHoursDisplayProps {
  regularHours?: BusinessHours
  moreHours?: MoreHoursType[]
}

const dayNames: Record<string, string> = {
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
  sunday: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
  SATURDAY: 'السبت',
  SUNDAY: 'الأحد',
}

const moreHoursNames: Record<string, string> = {
  BREAKFAST: 'الفطور',
  BRUNCH: 'الإفطار المتأخر',
  LUNCH: 'الغداء',
  DINNER: 'العشاء',
  HAPPY_HOUR: 'Happy Hour',
  KITCHEN: 'المطبخ',
  DELIVERY: 'التوصيل',
  TAKEOUT: 'الطلبات الخارجية',
  PICKUP: 'الاستلام',
  ACCESS: 'الوصول',
  SENIOR_HOURS: 'ساعات كبار السن',
  DRIVE_THROUGH: 'Drive Through',
  ONLINE_SERVICE_HOURS: 'ساعات الخدمة الإلكترونية',
}

export function BusinessHoursDisplay({ regularHours, moreHours }: BusinessHoursDisplayProps) {
  // Debug logging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[BusinessHoursDisplay] regularHours:', regularHours)
    console.log('[BusinessHoursDisplay] moreHours:', moreHours)
  }

  if (!regularHours && (!moreHours || moreHours.length === 0)) {
    return null
  }

  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <div className="space-y-6">
      {/* Regular Hours */}
      {regularHours && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">ساعات العمل</h3>
          </div>
          <div className="space-y-2">
            {daysOrder.map((day) => {
              const hours = regularHours[day as keyof BusinessHours]
              if (!hours) return null

              return (
                <div
                  key={day}
                  className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0"
                >
                  <span className="text-zinc-300 font-medium">{dayNames[day]}</span>
                  {hours.closed ? (
                    <span className="text-red-400">مغلق</span>
                  ) : (
                    <span className="text-zinc-400 font-mono">
                      {hours.open} - {hours.close}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* More Hours */}
      {moreHours && moreHours.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">ساعات إضافية</h3>
          </div>
          <div className="space-y-4">
            {moreHours.map((mh, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-sm font-semibold text-orange-400">
                  {moreHoursNames[mh.hoursTypeId] || mh.displayName}
                </h4>
                <div className="space-y-1">
                  {mh.periods.map((period, periodIdx) => (
                    <div
                      key={periodIdx}
                      className="flex justify-between items-center py-1 text-sm"
                    >
                      <span className="text-zinc-400">{dayNames[period.openDay] || period.openDay}</span>
                      <span className="text-zinc-500 font-mono">
                        {period.openTime} - {period.closeTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

