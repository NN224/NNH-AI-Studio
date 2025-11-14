'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  mode?: "single" | "multiple" | "range";
  selected?: Date | Date[] | { from: Date; to: Date };
  onSelect?: (date: Date | Date[] | { from: Date; to: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
}

export function Calendar({
  className,
  selected,
  onSelect,
  ...props
}: CalendarProps) {
  return (
    <div className={cn("p-3", className)} {...props}>
      {/* Simplified calendar - in production use react-day-picker or similar */}
      <input
        type="date"
        value={selected instanceof Date ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          const date = e.target.value ? new Date(e.target.value) : undefined;
          onSelect?.(date as any);
        }}
        className="w-full px-3 py-2 border rounded-md"
      />
    </div>
  );
}
