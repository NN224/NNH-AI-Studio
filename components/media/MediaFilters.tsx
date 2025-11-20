"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Location {
  id: string;
  location_name: string;
}

interface MediaFilters {
  locationId: string;
}

interface MediaFiltersProps {
  locations: Location[];
  filters: MediaFilters;
  onFiltersChange: (filters: MediaFilters) => void;
}

export function MediaFilters({
  locations,
  filters,
  onFiltersChange,
}: MediaFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Select
        value={filters.locationId}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            locationId: value === "all" ? "" : value,
          })
        }
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Filter by location..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.location_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
