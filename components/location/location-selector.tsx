"use client";

/**
 * Location Selector - Simple dropdown for selecting business locations
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  location_name: string;
  logo_url?: string;
  address?: string;
  rating?: number;
}

interface LocationSelectorProps {
  variant?: "default" | "compact";
  className?: string;
  onLocationChange?: (location: Location) => void;
}

export function LocationSelector({
  variant = "default",
  className,
  onLocationChange,
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("gmb_locations")
        .select("id, location_name, logo_url, address, rating")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setLocations(data);
        setSelectedLocation(data[0]);
      }
      setIsLoading(false);
    };

    fetchLocations();
  }, []);

  const handleLocationChange = (location: Location) => {
    setSelectedLocation(location);
    setIsOpen(false);
    onLocationChange?.(location);
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "h-10 bg-zinc-800/50 rounded-lg animate-pulse",
          className,
        )}
      />
    );
  }

  if (locations.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg",
          className,
        )}
      >
        <MapPin className="w-4 h-4 text-zinc-500" />
        <span className="text-sm text-zinc-500">No locations</span>
      </div>
    );
  }

  if (locations.length === 1) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg",
          className,
        )}
      >
        {selectedLocation?.logo_url ? (
          <Image
            src={selectedLocation.logo_url}
            alt=""
            width={20}
            height={20}
            className="rounded"
          />
        ) : (
          <MapPin className="w-4 h-4 text-orange-500" />
        )}
        <span className="text-sm text-zinc-200 truncate max-w-[150px]">
          {selectedLocation?.location_name}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedLocation?.logo_url ? (
            <Image
              src={selectedLocation.logo_url}
              alt=""
              width={20}
              height={20}
              className="rounded flex-shrink-0"
            />
          ) : (
            <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
          )}
          <span className="text-sm text-zinc-200 truncate">
            {selectedLocation?.location_name}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-zinc-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationChange(location)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2.5 hover:bg-zinc-800 transition-colors",
                    selectedLocation?.id === location.id && "bg-zinc-800/50",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {location.logo_url ? (
                      <Image
                        src={location.logo_url}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded flex-shrink-0"
                      />
                    ) : (
                      <MapPin className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    )}
                    <span className="text-sm text-zinc-200 truncate">
                      {location.location_name}
                    </span>
                  </div>
                  {selectedLocation?.id === location.id && (
                    <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
