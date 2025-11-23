"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  url: string;
  metadata?: any;
}

interface MediaUploaderProps {
  locationId?: string;
  onUploadComplete: (uploaded: MediaItem[]) => void;
}

export function MediaUploader({
  locationId,
  onUploadComplete,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      const formData = new FormData();

      acceptedFiles.forEach((file: File) => {
        formData.append("files", file);
      });

      if (locationId) {
        formData.append("locationId", locationId);
      }

      try {
        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        toast.success(`Successfully uploaded ${data.uploaded.length} image(s)`);
        onUploadComplete(data.uploaded);
      } catch (error) {
        toast.error("Failed to upload images");
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete, locationId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center transition ${
        !locationId
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-orange-500"
      }`}
    >
      <input {...getInputProps()} disabled={!locationId} />
      {uploading ? (
        <Loader2 className="w-12 h-12 mx-auto animate-spin" />
      ) : (
        <>
          <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
          <p className="text-zinc-500">
            {!locationId
              ? "Select a location to upload media"
              : isDragActive
                ? "Drop the images here"
                : "Drag and drop some files here, or click to select files"}
          </p>
        </>
      )}
    </div>
  );
}
