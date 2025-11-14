/**
 * Utility functions for converting location coordinates
 * between database format (latitude/longitude) and API format (coordinates: { lat, lng })
 */

/**
 * Convert database latitude/longitude to coordinates object
 * Also checks metadata.latlng as fallback
 */
export function mapLocationCoordinates(location: any): { lat: number; lng: number } | undefined {
  // Priority 1: Direct latitude/longitude fields stored on the row
  if (location.latitude != null && location.longitude != null) {
    const lat = typeof location.latitude === 'number'
      ? location.latitude
      : parseFloat(location.latitude);
    const lng = typeof location.longitude === 'number'
      ? location.longitude
      : parseFloat(location.longitude);
    
    // Validate coordinates are within valid ranges
    if (!isNaN(lat) && !isNaN(lng) && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Priority 2: Top-level latlng column (JSON from database)
  if (location.latlng) {
    const latlng = location.latlng;
    // Shape: { latitude, longitude }
    if (typeof latlng === 'object' && latlng.latitude != null && latlng.longitude != null) {
      const lat = typeof latlng.latitude === 'number'
        ? latlng.latitude
        : parseFloat(latlng.latitude);
      const lng = typeof latlng.longitude === 'number'
        ? latlng.longitude
        : parseFloat(latlng.longitude);

      if (!isNaN(lat) &&
          !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    // Shape: { lat, lng }
    if (typeof latlng === 'object' && latlng.lat != null && latlng.lng != null) {
      const lat = typeof latlng.lat === 'number'
        ? latlng.lat
        : parseFloat(latlng.lat);
      const lng = typeof latlng.lng === 'number'
        ? latlng.lng
        : parseFloat(latlng.lng);

      if (!isNaN(lat) &&
          !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  // Priority 3: Check metadata.latlng (most common source from Google API)
  const metadata = location.metadata || {};
  if (metadata.latlng) {
    const latlng = metadata.latlng;
    
    // Handle { latitude, longitude } format (Google API format)
    if (typeof latlng === 'object' && latlng.latitude != null && latlng.longitude != null) {
      const lat = typeof latlng.latitude === 'number'
        ? latlng.latitude
        : parseFloat(latlng.latitude);
      const lng = typeof latlng.longitude === 'number'
        ? latlng.longitude
        : parseFloat(latlng.longitude);
      
      if (!isNaN(lat) && !isNaN(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    
    // Handle { lat, lng } format (alternative format)
    if (typeof latlng === 'object' && latlng.lat != null && latlng.lng != null) {
      const lat = typeof latlng.lat === 'number'
        ? latlng.lat
        : parseFloat(latlng.lat);
      const lng = typeof latlng.lng === 'number'
        ? latlng.lng
        : parseFloat(latlng.lng);
      
      if (!isNaN(lat) && !isNaN(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    
    // Handle string format (e.g., "25.2048,55.2708")
    if (typeof latlng === 'string') {
      const parts = latlng.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng) && 
            lat >= -90 && lat <= 90 && 
            lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    }
  }

  // Priority 4: Check metadata for lat/lng directly
  if (metadata.latitude != null && metadata.longitude != null) {
    const lat = typeof metadata.latitude === 'number'
      ? metadata.latitude
      : parseFloat(metadata.latitude);
    const lng = typeof metadata.longitude === 'number'
      ? metadata.longitude
      : parseFloat(metadata.longitude);
    
    if (!isNaN(lat) && !isNaN(lng) && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // No valid coordinates found
  return undefined;
}

/**
 * Add coordinates field to location object
 * Returns location with coordinates field added/updated
 */
export function addCoordinatesToLocation(location: any): any {
  const coordinates = mapLocationCoordinates(location);
  return {
    ...location,
    coordinates: coordinates || undefined
  };
}

/**
 * Add coordinates to array of locations
 */
export function addCoordinatesToLocations(locations: any[]): any[] {
  return locations.map(addCoordinatesToLocation);
}

