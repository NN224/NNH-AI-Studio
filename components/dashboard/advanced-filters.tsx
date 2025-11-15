'use client'

import { useState, useCallback, useMemo } from 'react'
import { Filter, X, Save, Download, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface FilterPreset {
  id: string
  name: string
  filters: DashboardFilters
}

export interface DashboardFilters {
  dateRange?: {
    from: Date
    to: Date
  }
  locations?: string[]
  ratings?: number[]
  reviewStatus?: ('pending' | 'replied' | 'flagged')[]
  minRating?: number
  maxRating?: number
  searchQuery?: string
}

interface AdvancedFiltersProps {
  onApply: (filters: DashboardFilters) => void
  onExport?: (filters: DashboardFilters) => void
  locations?: Array<{ id: string; name: string }>
  locale?: 'ar' | 'en'
}

export function AdvancedFilters({
  onApply,
  onExport,
  locations = [],
  locale = 'en',
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>({})
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-filter-presets')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [presetName, setPresetName] = useState('')

  const updateFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const handleApply = useCallback(() => {
    onApply(filters)
    setOpen(false)
  }, [filters, onApply])

  const handleExport = useCallback(() => {
    onExport?.(filters)
  }, [filters, onExport])

  const savePreset = useCallback(() => {
    if (!presetName.trim()) return

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: { ...filters },
    }

    const updatedPresets = [...presets, newPreset]
    setPresets(updatedPresets)
    localStorage.setItem('dashboard-filter-presets', JSON.stringify(updatedPresets))
    setPresetName('')
  }, [presetName, filters, presets])

  const loadPreset = useCallback((preset: FilterPreset) => {
    setFilters(preset.filters)
  }, [])

  const deletePreset = useCallback((presetId: string) => {
    const updatedPresets = presets.filter((p) => p.id !== presetId)
    setPresets(updatedPresets)
    localStorage.setItem('dashboard-filter-presets', JSON.stringify(updatedPresets))
  }, [presets])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.dateRange) count++
    if (filters.locations && filters.locations.length > 0) count++
    if (filters.ratings && filters.ratings.length > 0) count++
    if (filters.reviewStatus && filters.reviewStatus.length > 0) count++
    if (filters.minRating !== undefined) count++
    if (filters.searchQuery) count++
    return count
  }, [filters])

  const t = {
    title: locale === 'ar' ? 'الفلاتر المتقدمة' : 'Advanced Filters',
    description: locale === 'ar' ? 'قم بتخصيص البيانات المعروضة' : 'Customize your data view',
    dateRange: locale === 'ar' ? 'نطاق التاريخ' : 'Date Range',
    from: locale === 'ar' ? 'من' : 'From',
    to: locale === 'ar' ? 'إلى' : 'To',
    locations: locale === 'ar' ? 'المواقع' : 'Locations',
    selectLocations: locale === 'ar' ? 'اختر المواقع' : 'Select locations',
    ratings: locale === 'ar' ? 'التقييمات' : 'Ratings',
    reviewStatus: locale === 'ar' ? 'حالة المراجعة' : 'Review Status',
    pending: locale === 'ar' ? 'قيد الانتظار' : 'Pending',
    replied: locale === 'ar' ? 'تم الرد' : 'Replied',
    flagged: locale === 'ar' ? 'مُعلّم' : 'Flagged',
    minRating: locale === 'ar' ? 'الحد الأدنى للتقييم' : 'Minimum Rating',
    search: locale === 'ar' ? 'بحث' : 'Search',
    searchPlaceholder: locale === 'ar' ? 'ابحث في المراجعات...' : 'Search reviews...',
    savePreset: locale === 'ar' ? 'حفظ الفلتر' : 'Save Preset',
    presetName: locale === 'ar' ? 'اسم الفلتر' : 'Preset Name',
    savedPresets: locale === 'ar' ? 'الفلاتر المحفوظة' : 'Saved Presets',
    apply: locale === 'ar' ? 'تطبيق' : 'Apply',
    clear: locale === 'ar' ? 'مسح' : 'Clear',
    export: locale === 'ar' ? 'تصدير' : 'Export',
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          {t.title}
          {activeFiltersCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.title}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>{t.dateRange}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !filters.dateRange?.from && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.dateRange?.from ? (
                      format(filters.dateRange.from, 'PPP')
                    ) : (
                      <span>{t.from}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange?.from}
                    onSelect={(date) =>
                      updateFilter('dateRange', {
                        from: date || new Date(),
                        to: filters.dateRange?.to || new Date(),
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !filters.dateRange?.to && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.dateRange?.to ? (
                      format(filters.dateRange.to, 'PPP')
                    ) : (
                      <span>{t.to}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange?.to}
                    onSelect={(date) =>
                      updateFilter('dateRange', {
                        from: filters.dateRange?.from || new Date(),
                        to: date || new Date(),
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Locations */}
          {locations.length > 0 && (
            <div className="space-y-2">
              <Label>{t.locations}</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={filters.locations?.includes(location.id)}
                      onCheckedChange={(checked) => {
                        const current = filters.locations || []
                        updateFilter(
                          'locations',
                          checked
                            ? [...current, location.id]
                            : current.filter((id) => id !== location.id)
                        )
                      }}
                    />
                    <label
                      htmlFor={`location-${location.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          <div className="space-y-2">
            <Label>{t.ratings}</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={filters.ratings?.includes(rating) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const current = filters.ratings || []
                    updateFilter(
                      'ratings',
                      current.includes(rating)
                        ? current.filter((r) => r !== rating)
                        : [...current, rating]
                    )
                  }}
                >
                  {rating}★
                </Button>
              ))}
            </div>
          </div>

          {/* Review Status */}
          <div className="space-y-2">
            <Label>{t.reviewStatus}</Label>
            <div className="space-y-2">
              {(['pending', 'replied', 'flagged'] as const).map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.reviewStatus?.includes(status)}
                    onCheckedChange={(checked) => {
                      const current = filters.reviewStatus || []
                      updateFilter(
                        'reviewStatus',
                        checked
                          ? [...current, status]
                          : current.filter((s) => s !== status)
                      )
                    }}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t[status]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-2">
            <Label>{t.minRating}</Label>
            <Select
              value={filters.minRating?.toString()}
              onValueChange={(value) => updateFilter('minRating', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.minRating} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1★</SelectItem>
                <SelectItem value="2">2★</SelectItem>
                <SelectItem value="3">3★</SelectItem>
                <SelectItem value="4">4★</SelectItem>
                <SelectItem value="5">5★</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label>{t.search}</Label>
            <Input
              placeholder={t.searchPlaceholder}
              value={filters.searchQuery || ''}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
            />
          </div>

          {/* Save Preset */}
          <div className="space-y-2">
            <Label>{t.savePreset}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t.presetName}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <Button onClick={savePreset} disabled={!presetName.trim()}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Saved Presets */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <Label>{t.savedPresets}</Label>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadPreset(preset)}
                      className="flex-1 justify-start"
                    >
                      {preset.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePreset(preset.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={clearFilters} variant="outline" className="flex-1">
            <X className="h-4 w-4 mr-2" />
            {t.clear}
          </Button>
          {onExport && (
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={handleApply} className="flex-1">
            <Filter className="h-4 w-4 mr-2" />
            {t.apply}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

