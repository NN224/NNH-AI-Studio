"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Video, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

interface LocationMediaSectionProps {
  locationId: string;
  locationName: string;
}

export function LocationMediaSection({
  locationId,
  locationName,
}: LocationMediaSectionProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchMedia = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gmb/media?locationId=${locationId}`);
        const data = await response.json();

        if (response.ok && data.data?.media) {
          setMedia(data.data.media);
        }
      } catch (error) {
        gmbLogger.error(
          "Error fetching media",
          error instanceof Error ? error : new Error(String(error)),
          { locationId },
        );
        toast.error("Failed to load media");
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [locationId]);

  const handleUpload = () => {
    toast.info("Upload functionality coming soon");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading media...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const photos = media.filter(
    (item: any) => item.mediaFormat !== "VIDEO" && item.type !== "VIDEO",
  );
  const videos = media.filter(
    (item: any) => item.mediaFormat === "VIDEO" || item.type === "VIDEO",
  );

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Media Library</CardTitle>
            <Button onClick={handleUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Media
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardContent className="p-4 text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{photos.length}</div>
                <div className="text-sm text-muted-foreground">Photos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Video className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{videos.length}</div>
                <div className="text-sm text-muted-foreground">Videos</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Photos Gallery */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos ({photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo: any, index: number) => {
                const url =
                  photo.sourceUrl ||
                  photo.googleUrl ||
                  photo.url ||
                  photo.thumbnailUrl;
                const category =
                  photo.locationAssociation?.category || photo.category;

                return (
                  <div
                    key={photo.mediaItemId || index}
                    className="group relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={photo.description || `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {category && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 text-xs"
                      >
                        {category}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Videos ({videos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video: any, index: number) => {
                const url =
                  video.sourceUrl ||
                  video.googleUrl ||
                  video.url ||
                  video.thumbnailUrl;
                const category =
                  video.locationAssociation?.category || video.category;

                return (
                  <div
                    key={video.mediaItemId || index}
                    className="group relative aspect-video rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  >
                    {url ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {category && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 text-xs"
                      >
                        {category}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {photos.length === 0 && videos.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No media found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload photos and videos to showcase your location
              </p>
              <Button onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
