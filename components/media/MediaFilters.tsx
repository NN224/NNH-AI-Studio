'use client';

import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MediaFilters({ locations, filters, onFiltersChange }) {
  const t = useTranslations('Media.filters');

  return (
    <div className="flex items-center gap-4">
      <Select
        value={filters.locationId}
        onValueChange={(value) => onFiltersChange({ ...filters, locationId: value === 'all' ? '' : value })}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder={t('placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allLocations')}</SelectItem>
          {locations.map(location => (
            <SelectItem key={location.id} value={location.id}>
              {location.location_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
