"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPost } from "@/server/actions/posts-management";
import { Image as ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { postsLogger } from "@/lib/utils/logger";
import {
  CTA_OPTIONS,
  POST_TYPES,
  validatePostForm,
  type PostFormData,
} from "./post-form-validation";

type PostType = "whats_new" | "event" | "offer" | "product";

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Array<{ id: string; location_name: string }>;
  onSuccess?: () => void;
}

export function CreatePostDialog({
  isOpen,
  onClose,
  locations,
  onSuccess,
}: CreatePostDialogProps) {
  const [postType, setPostType] = useState<PostType>("whats_new");
  const [locationId, setLocationId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [cta, setCta] = useState<string>("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type", {
          description: "Please upload a JPG, PNG, GIF, or WebP image",
        });
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Maximum file size is 10MB",
        });
        return;
      }

      if (!locationId) {
        toast.error("Please select a location first");
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("locationId", locationId);

        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        if (data.url) {
          setMediaUrl(data.url);
          setUploadedFile(file);
          toast.success("Image uploaded successfully!");
        }
      } catch (error) {
        postsLogger.error(
          "Upload error",
          error instanceof Error ? error : new Error(String(error)),
          { locationId },
        );
        toast.error("Failed to upload image", {
          description:
            error instanceof Error ? error.message : "Please try again",
        });
      } finally {
        setUploading(false);
      }
    },
    [locationId],
  );

  const handleRemoveMedia = useCallback(() => {
    setMediaUrl("");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleGenerateAI = useCallback(async () => {
    if (!description.trim() && !title.trim()) {
      toast.error("Please enter some content to generate from");
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/ai/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "gmb",
          prompt: description || title,
          tone: "friendly",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();
      if (data?.title) setTitle(data.title);
      if (data?.description) setDescription(data.description);

      toast.success("Content generated successfully!");
    } catch (error) {
      postsLogger.error(
        "Generate error",
        error instanceof Error ? error : new Error(String(error)),
        { locationId },
      );
      toast.error("Failed to generate content", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setGenerating(false);
    }
  }, [description, title]);

  const handlePublish = useCallback(async () => {
    // Validation using shared utility
    const formData: PostFormData = {
      locationId,
      title,
      description,
      mediaUrl,
      cta,
      ctaUrl,
      scheduledAt,
    };

    const validation = validatePostForm(formData);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsPublishing(true);

    try {
      const result = await createPost({
        locationId,
        postType,
        title: title || undefined,
        description: description.trim(),
        mediaUrl: mediaUrl || undefined,
        ctaType: cta ? (cta as any) : undefined,
        ctaUrl: ctaUrl || undefined,
        scheduledAt: scheduledAt || undefined,
      });

      if (result.success) {
        toast.success(result.message || "Post created successfully!");
        handleClose();
        onSuccess?.();
      } else {
        if (result.errorCode === "AUTH_EXPIRED") {
          toast.error("Authentication expired", {
            description: result.error,
            action: {
              label: "Reconnect Google",
              onClick: () => (window.location.href = "/settings?tab=accounts"),
            },
          });
        } else {
          toast.error("Failed to create post", {
            description: result.error || "Please try again",
          });
        }
      }
    } catch (error) {
      postsLogger.error(
        "Error creating post",
        error instanceof Error ? error : new Error(String(error)),
        { locationId, postType },
      );
      toast.error("An unexpected error occurred", {
        description: "Please try again later",
      });
    } finally {
      setIsPublishing(false);
    }
  }, [
    locationId,
    postType,
    title,
    description,
    mediaUrl,
    cta,
    ctaUrl,
    scheduledAt,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    setPostType("whats_new");
    setLocationId("");
    setTitle("");
    setDescription("");
    setMediaUrl("");
    setCta("");
    setCtaUrl("");
    setScheduledAt("");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (!open ? handleClose() : null)}
    >
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Create New Post</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Draft and publish a Google Business Profile post.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Location Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Location *</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((loc) => loc.id && loc.id.trim() !== "")
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post Type */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Post Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {POST_TYPES.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPostType(opt.key as PostType)}
                  className={`px-3 py-2 rounded-md border text-sm transition-all ${
                    postType === (opt.key as PostType)
                      ? "bg-orange-600 border-orange-600 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10"
                  }`}
                  aria-pressed={postType === opt.key}
                  aria-label={`Select ${opt.label} post type`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(postType === "event" || postType === "offer") && (
              <p className="text-xs text-yellow-400">
                Note: Event and Offer posts can only be saved as drafts. Google
                Business Profile API currently only supports "What's New" posts
                for publishing.
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">
              Title (optional)
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="desc" className="text-zinc-300">
                Description *
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={generating}
                  className="text-orange-400 hover:text-orange-300"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Generate
                </Button>
                <span
                  className={`text-xs ${description.length > 1500 ? "text-red-400" : "text-zinc-500"}`}
                >
                  {description.length} / 1500
                </span>
              </div>
            </div>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a compelling description..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[120px]"
              maxLength={1600}
            />
            {description.length > 1500 && (
              <p className="text-xs text-red-400">
                Description exceeds the 1500 character limit
              </p>
            )}
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Media (optional)</Label>

            {!mediaUrl ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload"
                  disabled={!locationId || uploading}
                />
                <label htmlFor="media-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    disabled={!locationId || uploading}
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                </label>
                {!locationId && (
                  <p className="text-xs text-yellow-400">
                    Select a location first to upload media
                  </p>
                )}
                <p className="text-xs text-zinc-500">
                  Or enter a URL below (max 10MB, JPG/PNG/GIF/WebP)
                </p>
                <Input
                  id="media-url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            ) : (
              <div className="relative border border-zinc-700 rounded-lg p-4 bg-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <ImageIcon className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">
                      {uploadedFile?.name || "Media URL"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{mediaUrl}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveMedia}
                    className="shrink-0 text-zinc-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {mediaUrl &&
                  !uploadedFile &&
                  (() => {
                    // Sanitize URL to prevent XSS
                    try {
                      const url = new URL(mediaUrl);
                      // Only allow http/https protocols
                      if (
                        url.protocol === "http:" ||
                        url.protocol === "https:"
                      ) {
                        return (
                          <img
                            src={url.href}
                            alt="Preview"
                            className="mt-2 max-h-40 rounded-md object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        );
                      }
                    } catch {
                      // Invalid URL, don't render
                      return null;
                    }
                    return null;
                  })()}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">CTA Button</Label>
              <Select value={cta} onValueChange={setCta}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select CTA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {CTA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url" className="text-zinc-300">
                CTA URL
              </Label>
              <Input
                id="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                disabled={!cta || cta === "CALL"}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="schedule" className="text-zinc-300">
              Schedule (optional)
            </Label>
            <Input
              id="schedule"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              min={new Date().toISOString().slice(0, 16)}
            />
            {scheduledAt && (
              <p className="text-xs text-zinc-500">
                Post will be saved as scheduled and published at the specified
                time
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !locationId || !description.trim()}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Post"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
