/**
 * Utility functions for GMB connection events
 */

/**
 * Dispatch GMB connection event to update all components
 */
export function dispatchGmbConnectionEvent(
  type: "connected" | "disconnected" | "sync-complete",
) {
  if (typeof window === "undefined") return;

  const eventName = `gmb-${type}`;
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail: { timestamp: Date.now() },
    }),
  );

  // Also dispatch generic refresh event
  window.dispatchEvent(
    new CustomEvent("dashboard:refresh", {
      detail: { source: "gmb", type },
    }),
  );
}

/**
 * Force refresh all GMB-related data
 * @param skipReload - If true, skip the page reload (useful when React Query handles refresh)
 */
export function forceGmbRefresh(skipReload = false) {
  if (typeof window === "undefined") return;

  // Clear localStorage cache
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("gmb_") || key.startsWith("dashboard_")) {
      localStorage.removeItem(key);
    }
  });

  // Clear sessionStorage GMB data
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach((key) => {
    if (key.startsWith("gmb_") || key.startsWith("dashboard_")) {
      sessionStorage.removeItem(key);
    }
  });

  // Dispatch events to notify components
  dispatchGmbConnectionEvent("connected");

  // Only reload if not skipped - React Query's refetchOnMount handles most cases
  if (!skipReload) {
    window.location.reload();
  }
}

/**
 * Listen for GMB events and execute callback
 */
export function listenForGmbEvents(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const events = [
    "gmb-connected",
    "gmb-disconnected",
    "gmb-sync-complete",
    "dashboard:refresh",
  ];

  events.forEach((event) => {
    window.addEventListener(event, callback);
  });

  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, callback);
    });
  };
}
