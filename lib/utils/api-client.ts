/**
 * Secure API client with CSRF protection
 */

let csrfToken: string | null = null;

/**
 * Get CSRF token, fetching it if necessary
 */
async function ensureCSRFToken(): Promise<string> {
  if (!csrfToken) {
    try {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      csrfToken = data.token || null;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }
  return csrfToken || '';
}

/**
 * Clear cached CSRF token (useful on 403 responses)
 */
function clearCSRFToken(): void {
  csrfToken = null;
}

/**
 * Enhanced fetch with automatic CSRF token inclusion
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Only add CSRF token for state-changing methods
  const method = options.method?.toUpperCase() || 'GET';
  const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (needsCSRF) {
    const token = await ensureCSRFToken();
    
    // Add CSRF token to headers
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }

  try {
    const response = await fetch(url, options);

    // If we get a CSRF error, clear token and retry once
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      if (data.error?.includes('CSRF')) {
        clearCSRFToken();
        
        // Get new token from response if provided
        const newToken = data.csrfToken || response.headers.get('X-CSRF-Token');
        if (newToken) {
          csrfToken = newToken;
        } else {
          await ensureCSRFToken();
        }

        // Retry the request with new token
        if (needsCSRF && csrfToken) {
          options.headers = {
            ...options.headers,
            'X-CSRF-Token': csrfToken,
          };
          return fetch(url, options);
        }
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const apiClient = {
  get: (url: string, options?: RequestInit) => 
    secureFetch(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options?: RequestInit) => 
    secureFetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: (url: string, data?: any, options?: RequestInit) => 
    secureFetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  patch: (url: string, data?: any, options?: RequestInit) => 
    secureFetch(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: (url: string, options?: RequestInit) => 
    secureFetch(url, { ...options, method: 'DELETE' }),
};

// Export as default for easy migration
export default apiClient;
