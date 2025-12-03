/**
 * GMB Service - Client-side only!
 *
 * ⚠️ WARNING: This service uses relative URLs and MUST only be used in:
 * - Client Components ("use client")
 * - React hooks (useQuery, useMutation)
 * - Browser event handlers
 *
 * DO NOT use in:
 * - Server Components
 * - API Routes
 * - Middleware
 *
 * For server-side GMB operations, use direct Supabase queries.
 */

export interface GMBAccount {
  id: string;
  name: string;
  accountName: string;
  state: string;
  type: string;
  is_active: boolean;
}

export interface GMBStatus {
  connected: boolean;
  activeAccount: GMBAccount | null;
  lastSync: string | null;
  hasLocations?: boolean;
  locationsCount?: number;
}

/**
 * Unified Connection Status
 * Supports partial connections (GMB + YouTube independently)
 */
export interface ConnectionStatus {
  hasGmbConnection: boolean;
  hasYoutubeConnection: boolean;
  gmbAccount: GMBAccount | null;
  youtubeChannelId: string | null;
  lastGmbSync: string | null;
  lastYoutubeSync: string | null;
}

export const GMBService = {
  // Get connection status
  getStatus: async (): Promise<GMBStatus> => {
    const response = await fetch("/api/gmb/status");
    if (!response.ok) throw new Error("Failed to fetch GMB status");
    const json = await response.json();
    // Handle wrapped response: { success: true, data: { connected: ... } }
    return json.data || json;
  },

  // Get all accounts
  getAccounts: async (): Promise<GMBAccount[]> => {
    const response = await fetch("/api/gmb/accounts");
    if (!response.ok) throw new Error("Failed to fetch GMB accounts");
    const json = await response.json();
    // Handle wrapped response
    return json.data || json;
  },

  // Connect/Auth URL
  getAuthUrl: async (): Promise<{ url: string }> => {
    const response = await fetch("/api/gmb/create-auth-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to get auth URL");
    }
    return response.json();
  },

  // Disconnect
  disconnect: async (options: {
    accountId?: string;
    revokeToken?: boolean;
    clearData?: boolean;
  }) => {
    const response = await fetch("/api/gmb/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to disconnect");
    }
    return response.json();
  },

  // Sync - uses enqueue-sync for reliable background processing
  sync: async (
    accountId: string,
    type: "full" | "locations" | "reviews" = "full",
  ) => {
    const response = await fetch("/api/gmb/enqueue-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        syncType: type === "full" ? "full" : "incremental",
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || "Sync failed");
    }
    return response.json();
  },
};
