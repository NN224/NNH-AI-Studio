import { GMBService } from "@/lib/services/gmb-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Keys for React Query cache
export const GMB_KEYS = {
  all: ["gmb"] as const,
  status: () => [...GMB_KEYS.all, "status"] as const,
  accounts: () => [...GMB_KEYS.all, "accounts"] as const,
};

export function useGMBStatus() {
  return useQuery({
    queryKey: GMB_KEYS.status(),
    queryFn: GMBService.getStatus,
    // Keep data fresh for 1 minute, cache for 10 minutes
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });
}

export function useGMBConnection(options?: {
  onDisconnectSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: GMBService.getAuthUrl,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate connection");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: GMBService.disconnect,
    onSuccess: () => {
      // Invalidate all GMB queries to refresh UI
      queryClient.invalidateQueries({ queryKey: GMB_KEYS.all });
      // Reset status immediately in cache to appear disconnected
      queryClient.setQueryData(GMB_KEYS.status(), {
        connected: false,
        activeAccount: null,
      });
      // Call custom success handler if provided
      options?.onDisconnectSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to disconnect");
    },
  });

  return {
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    isDisconnectSuccess: disconnectMutation.isSuccess,
  };
}

export function useGMBSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      type = "full",
    }: {
      accountId: string;
      type?: "full" | "locations" | "reviews";
    }) => GMBService.sync(accountId, type),
    onSuccess: () => {
      toast.success("Sync started successfully");
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: GMB_KEYS.status() });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }); // Assume dashboard uses this key
    },
    onError: (error: Error) => {
      toast.error(error.message || "Sync failed");
    },
  });
}
