// Business Hours Types - Comprehensive type definitions
export interface TimeOfDay {
  hours: number;
  minutes: number;
  nanos?: number;
}

export interface TimePeriod {
  openTime?: TimeOfDay;
  closeTime?: TimeOfDay;
}

export interface RegularHours {
  periods?: TimePeriod[];
}

export interface MoreHoursType {
  hoursTypeId: string;
  periods: TimePeriod[];
}

export interface BusinessHours {
  regularHours?: RegularHours;
  moreHours?: MoreHoursType[];
}

// Type guards for business hours
export function isTimeOfDay(data: unknown): data is TimeOfDay {
  if (!data || typeof data !== "object") return false;

  const time = data as Record<string, unknown>;

  return (
    typeof time.hours === "number" &&
    typeof time.minutes === "number" &&
    (time.nanos === undefined || typeof time.nanos === "number")
  );
}

export function isTimePeriod(data: unknown): data is TimePeriod {
  if (!data || typeof data !== "object") return false;

  const period = data as Record<string, unknown>;

  return (
    (period.openTime === undefined || isTimeOfDay(period.openTime)) &&
    (period.closeTime === undefined || isTimeOfDay(period.closeTime))
  );
}

export function isRegularHours(data: unknown): data is RegularHours {
  if (!data || typeof data !== "object") return false;

  const hours = data as Record<string, unknown>;

  return (
    hours.periods === undefined ||
    (Array.isArray(hours.periods) && hours.periods.every(isTimePeriod))
  );
}

export function isMoreHoursType(data: unknown): data is MoreHoursType {
  if (!data || typeof data !== "object") return false;

  const moreHours = data as Record<string, unknown>;

  return (
    typeof moreHours.hoursTypeId === "string" &&
    Array.isArray(moreHours.periods) &&
    moreHours.periods.every(isTimePeriod)
  );
}

export function isMoreHoursArray(data: unknown): data is MoreHoursType[] {
  return Array.isArray(data) && data.every(isMoreHoursType);
}

export function isBusinessHours(data: unknown): data is BusinessHours {
  if (!data || typeof data !== "object") return false;

  const hours = data as Record<string, unknown>;

  return (
    (hours.regularHours === undefined || isRegularHours(hours.regularHours)) &&
    (hours.moreHours === undefined || isMoreHoursArray(hours.moreHours))
  );
}

// Utility functions
export function parseBusinessHours(data: unknown): BusinessHours {
  if (isBusinessHours(data)) {
    return data;
  }

  // Try to parse from Record<string, unknown>
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const result: BusinessHours = {};

    if (obj.regularHours && isRegularHours(obj.regularHours)) {
      result.regularHours = obj.regularHours;
    }

    if (obj.moreHours && isMoreHoursArray(obj.moreHours)) {
      result.moreHours = obj.moreHours;
    }

    return result;
  }

  return {};
}

export function formatTimeOfDay(time: TimeOfDay): string {
  const hours = time.hours.toString().padStart(2, "0");
  const minutes = time.minutes.toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatTimePeriod(period: TimePeriod): string {
  if (!period.openTime || !period.closeTime) {
    return "Closed";
  }

  return `${formatTimeOfDay(period.openTime)} - ${formatTimeOfDay(period.closeTime)}`;
}
