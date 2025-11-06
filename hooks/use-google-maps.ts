'use client';

import { useLoadScript } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];

/**
 * Hook to load Google Maps API once and share across all components
 * Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY from environment variables
 * This prevents the "multiple times" error by using @react-google-maps/api's built-in singleton
 */
export function useGoogleMaps() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Check if API key is available
  if (!apiKey) {
    console.error('Google Maps API key is missing! Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in environment variables.');
    return { 
      isLoaded: false, 
      loadError: new Error('Google Maps API key is missing. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.') 
    };
  }

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  return { 
    isLoaded, 
    loadError 
  };
}
