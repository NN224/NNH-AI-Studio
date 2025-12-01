import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { apiLogger } from "@/lib/utils/logger";
import { toast } from "sonner";

const SERVICES_QUERY_KEY = "services";

interface DBService {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  duration_minutes: number;
  price_type: "fixed" | "range" | "starting_at" | "free" | "unknown";
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: string;
  currency: string;
  description: string;
  duration?: number;
  priceType?: "fixed" | "range" | "starting_at" | "free" | "unknown";
}

export function useServices(locationId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch Services
  const {
    data: services,
    isLoading,
    error,
  } = useQuery({
    queryKey: [SERVICES_QUERY_KEY, locationId],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("gmb_services")
        .select("*")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map DB fields to UI fields
      return (data as unknown as DBService[]).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price?.toString(),
        currency: item.currency,
        description: item.description,
        duration: item.duration_minutes,
        priceType: item.price_type,
      })) as ServiceItem[];
    },
    enabled: !!locationId && !!supabase,
  });

  // Create Service
  const createService = useMutation({
    mutationFn: async (newService: Partial<ServiceItem>) => {
      if (!supabase) throw new Error("Supabase not initialized");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("gmb_services")
        .insert({
          location_id: locationId,
          user_id: user.id,
          name: newService.name,
          category: newService.category,
          price: newService.price ? parseFloat(newService.price) : null,
          currency: newService.currency || "USD",
          description: newService.description,
          duration_minutes: newService.duration,
          price_type: newService.priceType || "fixed",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SERVICES_QUERY_KEY, locationId],
      });
      toast.success("Service created successfully");
    },
    onError: (error) => {
      apiLogger.error(
        "Error creating service",
        error instanceof Error ? error : new Error(String(error)),
        { locationId },
      );
      toast.error("Failed to create service");
    },
  });

  // Update Service
  const updateService = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ServiceItem>;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");

      const dbUpdates: Record<string, any> = {
        ...updates,
        price: updates.price ? parseFloat(updates.price) : undefined,
        duration_minutes: updates.duration,
        price_type: updates.priceType,
      };

      // Remove UI-only fields
      delete dbUpdates.duration;
      delete dbUpdates.priceType;

      const { data, error } = await supabase
        .from("gmb_services")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SERVICES_QUERY_KEY, locationId],
      });
      toast.success("Service updated successfully");
    },
    onError: (error) => {
      apiLogger.error(
        "Error updating service",
        error instanceof Error ? error : new Error(String(error)),
        { locationId },
      );
      toast.error("Failed to update service");
    },
  });

  // Delete Service
  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("gmb_services")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SERVICES_QUERY_KEY, locationId],
      });
      toast.success("Service deleted successfully");
    },
    onError: (error) => {
      apiLogger.error(
        "Error deleting service",
        error instanceof Error ? error : new Error(String(error)),
        { locationId },
      );
      toast.error("Failed to delete service");
    },
  });

  return {
    services,
    isLoading,
    error,
    createService,
    updateService,
    deleteService,
  };
}
