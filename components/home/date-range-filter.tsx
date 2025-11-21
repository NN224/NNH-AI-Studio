"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangeFilter({
  onDateRangeChange,
  className,
}: DateRangeFilterProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const presets = [
    { label: "Today", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const newRange = { from, to };
    setDate(newRange);
    onDateRangeChange(newRange);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-center gap-2", className)}
    >
      {/* Preset buttons */}
      <div className="hidden md:flex items-center gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.days}
            variant="ghost"
            size="sm"
            onClick={() => handlePresetClick(preset.days)}
            className={cn(
              "text-xs",
              date?.from &&
                date?.to &&
                Math.round(
                  (date.to.getTime() - date.from.getTime()) /
                    (1000 * 60 * 60 * 24),
                ) === preset.days &&
                "bg-orange-500/10 text-orange-500",
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom date picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            selected={date}
            onSelect={(newDate) => {
              if (newDate && typeof newDate === "object" && "from" in newDate) {
                setDate(newDate as DateRange);
                onDateRangeChange(newDate as DateRange);
              } else {
                setDate(undefined);
                onDateRangeChange(undefined);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </motion.div>
  );
}
