"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
} from "date-fns";
import { CalendarIcon, MapPin, TrendingUp, Clock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GMBLocation } from "@/lib/types/database";
import { gmbLogger } from "@/lib/utils/logger";

interface AnalyticsFiltersProps {
  onFiltersChange: (filters: AnalyticsFilters) => void;
  defaultDateRange?: string;
  defaultLocationIds?: string[];
}

export interface AnalyticsFilters {
  dateRange: {
    preset?: string;
    from: Date;
    to: Date;
  };
  locationIds: string[];
  comparison?: "previous_period" | "previous_year" | "none";
  metric?:
    | "all"
    | "impressions"
    | "clicks"
    | "calls"
    | "directions"
    | "website_visits";
}

const DATE_PRESETS = [
  {
    value: "7",
    label: "Last 7 days",
    getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    value: "30",
    label: "Last 30 days",
    getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    value: "90",
    label: "Last 90 days",
    getDates: () => ({ from: subDays(new Date(), 90), to: new Date() }),
  },
  {
    value: "this_week",
    label: "This week",
    getDates: () => ({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    }),
  },
  {
    value: "this_month",
    label: "This month",
    getDates: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    value: "this_year",
    label: "This year",
    getDates: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
  {
    value: "custom",
    label: "Custom range",
    getDates: () => ({ from: new Date(), to: new Date() }),
  },
];

const METRIC_OPTIONS = [
  { value: "all", label: "All metrics", icon: TrendingUp },
  { value: "impressions", label: "Impressions" },
  { value: "clicks", label: "Clicks" },
  { value: "calls", label: "Phone calls" },
  { value: "directions", label: "Direction requests" },
  { value: "website_visits", label: "Website visits" },
];

export function AnalyticsFilters({
  onFiltersChange,
  defaultDateRange = "30",
  defaultLocationIds = [],
}: AnalyticsFiltersProps) {
  const [locations, setLocations] = useState<GMBLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Filter states
  const [datePreset, setDatePreset] = useState(defaultDateRange);
  const [dateRange, setDateRange] = useState(() => {
    const preset = DATE_PRESETS.find((p) => p.value === defaultDateRange);
    return preset
      ? preset.getDates()
      : { from: subDays(new Date(), 30), to: new Date() };
  });
  const [selectedLocationIds, setSelectedLocationIds] =
    useState<string[]>(defaultLocationIds);
  const [comparison, setComparison] = useState<
    "previous_period" | "previous_year" | "none"
  >("previous_period");
  const [metric, setMetric] = useState<string>("all");

  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      try {
        const {
          data: { user },
        } = await supabase!.auth.getUser();
        if (!user) return;

        const { data } = await supabase!
          .from("gmb_locations")
          .select("id, location_name, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("location_name");

        if (data) {
          const locations = data as GMBLocation[];
          setLocations(locations);
          // Select all locations by default if none selected
          if (selectedLocationIds.length === 0) {
            setSelectedLocationIds(locations.map((l) => l.id));
          }
        }
      } catch (error) {
        gmbLogger.error(
          "Failed to load locations",
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        setLoadingLocations(false);
      }
    }

    loadLocations();
  }, []);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange({
      dateRange: {
        preset: datePreset !== "custom" ? datePreset : undefined,
        ...dateRange,
      },
      locationIds: selectedLocationIds,
      comparison,
      metric: metric as any,
    });
  }, [dateRange, selectedLocationIds, comparison, metric, datePreset]);

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    if (value !== "custom") {
      const preset = DATE_PRESETS.find((p) => p.value === value);
      if (preset) {
        setDateRange(preset.getDates());
      }
    }
  };

  const handleCustomDateSelect = (
    dates: { from?: Date; to?: Date } | undefined,
  ) => {
    if (dates?.from) {
      setDateRange({
        from: dates.from,
        to: dates.to || dates.from,
      });
    }
  };

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocationIds((prev) => {
      if (prev.includes(locationId)) {
        return prev.filter((id) => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  const handleSelectAllLocations = () => {
    if (selectedLocationIds.length === locations.length) {
      setSelectedLocationIds([]);
    } else {
      setSelectedLocationIds(locations.map((l) => l.id));
    }
  };

  const clearFilters = () => {
    setDatePreset("30");
    setDateRange({ from: subDays(new Date(), 30), to: new Date() });
    setSelectedLocationIds(locations.map((l) => l.id));
    setComparison("previous_period");
    setMetric("all");
  };

  const activeFiltersCount =
    (datePreset !== "30" ? 1 : 0) +
    (selectedLocationIds.length !== locations.length ? 1 : 0) +
    (comparison !== "previous_period" ? 1 : 0) +
    (metric !== "all" ? 1 : 0);

  return (
    <Card className="p-4 bg-card/50 border-primary/20">
      <div className="flex flex-wrap gap-4">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger className="w-[200px] bg-secondary border-primary/30">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {datePreset === "custom" && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={dateRange}
                  onSelect={handleCustomDateSelect as any}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Location Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <MapPin className="h-4 w-4" />
              {selectedLocationIds.length === locations.length
                ? "All locations"
                : `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? "s" : ""}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Select Locations</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSelectAllLocations}
                >
                  {selectedLocationIds.length === locations.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>

              {loadingLocations ? (
                <div className="text-sm text-muted-foreground">
                  Loading locations...
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {locations.map((location) => (
                    <label
                      key={location.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocationIds.includes(location.id)}
                        onChange={() => handleLocationToggle(location.id)}
                        className="rounded border-primary/50"
                      />
                      <span className="text-sm flex-1">
                        {location.location_name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Comparison Selector */}
        <Select
          value={comparison}
          onValueChange={(v) => setComparison(v as any)}
        >
          <SelectTrigger className="w-[180px] bg-secondary border-primary/30">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous_period">Previous period</SelectItem>
            <SelectItem value="previous_year">Previous year</SelectItem>
            <SelectItem value="none">No comparison</SelectItem>
          </SelectContent>
        </Select>

        {/* Metric Selector */}
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-[180px] bg-secondary border-primary/30">
            <TrendingUp className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Metrics</SelectLabel>
              {METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Active Filters Badge & Clear */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {activeFiltersCount} active filter
              {activeFiltersCount !== 1 ? "s" : ""}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Selected Locations Display */}
      {selectedLocationIds.length > 0 &&
        selectedLocationIds.length < locations.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedLocationIds.map((id) => {
              const location = locations.find((l) => l.id === id);
              return location ? (
                <Badge key={id} variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.location_name}
                </Badge>
              ) : null;
            })}
          </div>
        )}
    </Card>
  );
}
