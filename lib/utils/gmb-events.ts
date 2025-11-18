/**
 * Utility functions for GMB connection events
 */

/**
 * Dispatch GMB connection event to update all components
 */
export function dispatchGmbConnectionEvent(type: 'connected' | 'disconnected' | 'sync-complete') {
  if (typeof window === 'undefined') return;
  
  const eventName = `gmb-${type}`;
  window.dispatchEvent(new CustomEvent(eventName, {
    detail: { timestamp: Date.now() }
  }));
  
  // Also dispatch generic refresh event
  window.dispatchEvent(new CustomEvent('dashboard:refresh', {
    detail: { source: 'gmb', type }
  }));
}

/**
 * Force refresh all GMB-related data
 */
export function forceGmbRefresh() {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage cache
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('gmb_') || key.startsWith('dashboard_')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Dispatch events
  dispatchGmbConnectionEvent('connected');
  
  // Force page reload after a short delay
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

/**
 * Listen for GMB events and execute callback
 */
export function listenForGmbEvents(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  
  const events = ['gmb-connected', 'gmb-disconnected', 'gmb-sync-complete', 'dashboard:refresh'];
  
  events.forEach(event => {
    window.addEventListener(event, callback);
  });
  
  return () => {
    events.forEach(event => {
      window.removeEventListener(event, callback);
    });
  };
}
