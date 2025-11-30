"use client";

import { useLoadScript } from "@react-google-maps/api";

const libraries: "places"[] = ["places"];

/**
 * Hook to load Google Maps API once and share across all components
 * Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY from environment variables
 * This prevents the "multiple times" error by using @react-google-maps/api's built-in singleton
 */
export function useGoogleMaps() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Always call the hook unconditionally (React Hooks rules)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "placeholder", // Provide placeholder to satisfy hook
    libraries,
  });

  // Check if API key is available after hook call
  if (!apiKey) {
    return {
      isLoaded: false,
      loadError: new Error(
        "Google Maps API key is missing. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.",
      ),
    };
  }

  return {
    isLoaded,
    loadError,
  };
}
