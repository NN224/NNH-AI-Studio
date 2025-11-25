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

export const GMBService = {
  // Get connection status
  getStatus: async (): Promise<GMBStatus> => {
    const response = await fetch("/api/gmb/status");
    if (!response.ok) throw new Error("Failed to fetch GMB status");
    return response.json();
  },

  // Get all accounts
  getAccounts: async (): Promise<GMBAccount[]> => {
    const response = await fetch("/api/gmb/accounts");
    if (!response.ok) throw new Error("Failed to fetch GMB accounts");
    return response.json();
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

  // Sync
  sync: async (
    accountId: string,
    type: "full" | "locations" | "reviews" = "full",
  ) => {
    const response = await fetch("/api/gmb/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, syncType: type }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Sync failed");
    }
    return response.json();
  },
};
