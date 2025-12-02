"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  url: string;
  metadata?: {
    originalName?: string;
    [key: string]: unknown;
  };
}

interface MediaCardProps {
  mediaItem: MediaItem;
  onDelete: (id: string) => void;
}

export function MediaCard({ mediaItem, onDelete }: MediaCardProps) {
  const handleDelete = async () => {
    try {
      const response = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: mediaItem.id }),
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Image deleted successfully");
      onDelete(mediaItem.id);
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  return (
    <Card className="overflow-hidden group relative">
      <Image
        src={mediaItem.url}
        alt={mediaItem.metadata?.originalName || "Media item"}
        width={300}
        height={300}
        className="object-cover aspect-square"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button variant="destructive" size="icon" onClick={handleDelete}>
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}
