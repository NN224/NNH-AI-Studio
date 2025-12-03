"use client";

/**
 * Location Selector - Simple dropdown for selecting business locations
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface Location {
  id: string;
  location_name: string;
  logo_url?: string;
  address?: string;
  rating?: number;
}

export function LocationSelector() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      const supabase = createClient();
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

  if (isLoading) {
    return <div className="h-10 bg-gray-800/50 rounded-lg animate-pulse" />;
  }

  if (locations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
        <MapPin className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">No locations</span>
      </div>
    );
  }

  if (locations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
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
        <span className="text-sm text-gray-200 truncate max-w-[150px]">
          {selectedLocation?.location_name}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
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
          <span className="text-sm text-gray-200 truncate">
            {selectedLocation?.location_name}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    setSelectedLocation(location);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2.5 hover:bg-gray-800 transition-colors ${
                    selectedLocation?.id === location.id ? "bg-gray-800/50" : ""
                  }`}
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
                      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-200 truncate">
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
