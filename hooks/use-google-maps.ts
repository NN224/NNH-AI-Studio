'use client';

import { useState, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];

/**
 * Hook to load Google Maps API once and share across all components
 * Fetches API key from server-side endpoint to avoid exposing it in client code
 * This prevents the "multiple times" error by using @react-google-maps/api's built-in singleton
 */
export function useGoogleMaps() {
  const [apiKey, setApiKey] = useState<string>('');
  const [keyError, setKeyError] = useState<Error | null>(null);

  // Fetch API key from server-side endpoint
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/google-maps-config');
        if (!response.ok) {
          throw new Error('Failed to fetch Google Maps API key');
        }
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          throw new Error('Google Maps API key not configured');
        }
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
        setKeyError(error instanceof Error ? error : new Error('Unknown error'));
      }
    };

    fetchApiKey();
  }, []);

  // Load Google Maps script only if API key is available
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
    // Don't load if API key is not available
    ...(apiKey ? {} : { id: 'google-maps-script-placeholder' }),
  });

  return { 
    isLoaded: apiKey ? isLoaded : false, 
    loadError: keyError || loadError 
  };
}
