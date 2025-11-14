/**
 * Google Maps service that uses server-side proxy endpoints
 * This prevents exposing API keys on the client side
 */

export interface GeocodeResult {
  results: google.maps.GeocoderResult[];
  status: google.maps.GeocoderStatus;
}

export class GoogleMapsService {
  private static instance: GoogleMapsService;
  private isConfigured: boolean = false;

  private constructor() {}

  static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  /**
   * Check if Google Maps is properly configured on the server
   */
  async checkConfiguration(): Promise<boolean> {
    try {
      const response = await fetch('/api/google-maps/config');
      const data = await response.json();
      this.isConfigured = data.configured || false;
      return this.isConfigured;
    } catch (error) {
      console.error('Failed to check Google Maps configuration:', error);
      return false;
    }
  }

  /**
   * Geocode an address using the server-side proxy
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      const response = await fetch('/api/google-maps/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        console.error('Geocoding failed:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Generate a static map URL (server-side signed if needed)
   * For now, returns a placeholder - can be enhanced to use server signing
   */
  getStaticMapUrl(params: {
    center: string;
    zoom: number;
    size: string;
    markers?: string;
  }): string {
    // This should ideally go through a server endpoint that adds the API key
    // For now, return a placeholder or use an alternative
    return `/api/google-maps/static-map?${new URLSearchParams(params as any).toString()}`;
  }

  /**
   * Get a secure Google Maps embed URL from the server
   */
  async getEmbedUrl(params: {
    mode: 'place' | 'directions' | 'search' | 'view' | 'streetview';
    params: Record<string, any>;
  }): Promise<string | null> {
    try {
      const response = await fetch('/api/google-maps/embed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.error('Failed to get embed URL:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.embedUrl || null;
    } catch (error) {
      console.error('Embed URL error:', error);
      return null;
    }
  }

  /**
   * Load Google Maps JavaScript API dynamically
   * This should be done through a server proxy in the future
   */
  async loadMapsAPI(): Promise<boolean> {
    if (!this.isConfigured) {
      const configured = await this.checkConfiguration();
      if (!configured) {
        console.error('Google Maps is not configured on the server');
        return false;
      }
    }

    // For now, we'll need to handle this differently
    // The Maps JavaScript API needs to be loaded with a key
    // Consider using alternative mapping solutions or server-side rendering
    console.warn('Direct Maps JavaScript API loading needs to be replaced with a secure alternative');
    return false;
  }
}

// Export singleton instance
export const googleMapsService = GoogleMapsService.getInstance();
