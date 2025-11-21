import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Type definition matching the UI component
export type Message = {
  id: string;
  sender: string;
  avatar?: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  platform: "google" | "whatsapp" | "website";
  fullContent?: string; // Added for detail view
};

const MESSAGES_QUERY_KEY = "messages";

interface DBMessage {
  id: string;
  sender_name: string;
  sender_avatar_url: string;
  content: string;
  created_at: string;
  is_read: boolean;
  platform: "google" | "whatsapp" | "website";
}

export function useMessages(locationId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch Messages
  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: [MESSAGES_QUERY_KEY, locationId],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("gmb_messages")
        .select("*")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map DB fields to UI fields
      return (data as unknown as DBMessage[]).map((item) => ({
        id: item.id,
        sender: item.sender_name,
        avatar: item.sender_avatar_url,
        preview:
          item.content.substring(0, 50) +
          (item.content.length > 50 ? "..." : ""),
        fullContent: item.content,
        timestamp: new Date(item.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        unread: !item.is_read,
        platform: item.platform,
      })) as Message[];
    },
    enabled: !!locationId && !!supabase,
  });

  // Send Message (Reply)
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      platform,
      recipientId: _recipientId,
    }: {
      content: string;
      platform: string;
      recipientId?: string;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");

      // In a real app, this would call an external API (Google/WhatsApp)
      // For now, we just save the reply to the DB as a "sent" message
      const { data, error } = await supabase
        .from("gmb_messages")
        .insert({
          location_id: locationId,
          sender_name: "Business Owner", // You might want to fetch the actual user name
          content: content,
          platform: platform,
          is_from_business: true,
          is_read: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MESSAGES_QUERY_KEY, locationId],
      });
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}
