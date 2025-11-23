import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreatePostParams {
  locationId: string;
  content: string;
  callToAction?: string;
  mediaUrl?: string;
  aiGenerated?: boolean;
  promptUsed?: string;
  tone?: string;
}

export function usePosts() {
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: async (params: CreatePostParams) => {
      const response = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create post");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Post published successfully!");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  return {
    createPost,
  };
}
