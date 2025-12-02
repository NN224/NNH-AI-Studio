"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { BusinessInfoEditor } from "@/components/locations/business-info-editor";
import { LocationDetailHeader } from "@/components/locations/location-detail-header";
import { LocationMediaSection } from "@/components/locations/location-media-section";
import { LocationMediaUpload } from "@/components/locations/location-media-upload";
import { LocationMetricsSection } from "@/components/locations/location-metrics-section";
import { LocationQASection } from "@/components/locations/location-qa-section";
import { LocationReviewsSection } from "@/components/locations/location-reviews-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocationDetails } from "@/hooks/use-locations-cache";
import { useRouter } from "@/lib/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locationIdParam = params?.id;
  const locationId = Array.isArray(locationIdParam)
    ? locationIdParam[0]
    : locationIdParam || "";
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!locationId) {
      router.push("/locations");
    }
  }, [locationId, router]);

  const { data, loading, error, refetch } = useLocationDetails(locationId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading location details...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.location) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => {
            router.push("/locations");
            window.dispatchEvent(new Event("dashboard:refresh"));
          }}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Locations
        </Button>
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Location Not Found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {error?.message ||
                    "The location you are looking for does not exist or you do not have access to it."}
                </p>
                <Button
                  onClick={() => {
                    router.push("/locations");
                    window.dispatchEvent(new Event("dashboard:refresh"));
                  }}
                >
                  Go Back to Locations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const location = data.location;
  const locationData = location.location || {};
  const metadata = location.metadata || {};
  const gmbAccountId = location.gmb_account_id || metadata.gmb_account_id;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <LocationDetailHeader
          location={locationData}
          locationId={locationId}
          metadata={metadata}
          onRefresh={() => {
            refetch();
            window.dispatchEvent(new Event("dashboard:refresh"));
          }}
          gmbAccountId={gmbAccountId}
        />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 glass-strong border-primary/30">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="qa">Q&A</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <BusinessInfoEditor
              locationId={locationId}
              location={locationData}
              onUpdate={() => {
                refetch();
                window.dispatchEvent(new Event("dashboard:refresh"));
              }}
            />

            {/* Media Upload Section */}
            <LocationMediaUpload
              locationId={locationId}
              currentLogo={location.logo_url}
              currentCover={location.cover_photo_url}
              onUploadSuccess={() => {
                refetch();
                window.dispatchEvent(new Event("dashboard:refresh"));
              }}
            />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6 mt-6">
            <LocationReviewsSection
              locationId={locationId}
              locationName={
                locationData.name || locationData.title || "Location"
              }
            />
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6 mt-6">
            <LocationMediaSection
              locationId={locationId}
              locationName={
                locationData.name || locationData.title || "Location"
              }
            />
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6 mt-6">
            <LocationMetricsSection
              locationId={locationId}
              locationName={
                locationData.name || locationData.title || "Location"
              }
            />
          </TabsContent>

          {/* Q&A Tab */}
          <TabsContent value="qa" className="space-y-6 mt-6">
            <LocationQASection
              locationId={locationId}
              locationName={
                locationData.name || locationData.title || "Location"
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
