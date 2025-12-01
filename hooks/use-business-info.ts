"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiLogger } from "@/lib/utils/logger";

interface UpdateBusinessInfoParams {
  name?: string;
  description?: string;
  category?: string;
  phone?: string;
  website?: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export function useBusinessInfo(locationId: string) {
  const queryClient = useQueryClient();

  const updateBusinessInfo = useMutation({
    mutationFn: async (data: UpdateBusinessInfoParams) => {
      const response = await fetch(`/api/locations/${locationId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update business info");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["location", locationId] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-snapshot"] });
    },
    onError: (error: Error) => {
      apiLogger.error("Business info update error", error, { locationId });
    },
  });

  return {
    updateBusinessInfo,
  };
}
