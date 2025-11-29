"use client";

import { BulkUpdateDialog } from "@/components/features/bulk-update-dialog";
import { BusinessHoursDisplay } from "@/components/features/business-hours-display";
import { ChangeHistoryPanel } from "@/components/features/change-history-panel";
import { ServiceItemsDisplay } from "@/components/features/service-items-display";
import { ValidationPanel } from "@/components/features/validation-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSnapshot } from "@/hooks/use-dashboard-cache";
import { t } from "@/lib/i18n/stub";
import type { BusinessProfilePayload } from "@/types/features";
import {
  Copy,
  Download,
  FileText,
  History,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProfileCompletenessCard } from "./ProfileCompletenessCard";
import { BusinessInfoTab, FeaturesTab } from "./TabComponents";

interface TabDefinition {
  readonly id: TabKey;
  readonly name: string;
  readonly icon: string;
}

type TabKey = "info" | "features" | "validation" | "history";

const TABS: readonly TabDefinition[] = [
  { id: "info", name: "Basic Info", icon: "FileText" },
  { id: "features", name: "Features", icon: "Sparkles" },
  { id: "validation", name: "Validation", icon: "Shield" },
  { id: "history", name: "History", icon: "History" },
];

function fingerprint(profile: BusinessProfilePayload | null): string {
  return profile ? JSON.stringify(profile) : "";
}

function cloneProfilePayload(
  payload: BusinessProfilePayload,
): BusinessProfilePayload {
  if (typeof structuredClone === "function") {
    return structuredClone(payload);
  }
  return JSON.parse(JSON.stringify(payload)) as BusinessProfilePayload;
}

export default function BusinessProfilePage() {
  const {
    data: snapshot,
    loading: snapshotLoading,
    error: snapshotError,
  } = useDashboardSnapshot();

  const locations = useMemo(
    () => snapshot?.locationSummary?.locations ?? [],
    [snapshot?.locationSummary?.locations],
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [profile, setProfile] = useState<BusinessProfilePayload | null>(null);
  const [initialProfile, setInitialProfile] =
    useState<BusinessProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Removed profile locking - simplified UX
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setProfile(null);
      setInitialProfile(null);
      setProfileError(null);
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError(null);

        const response = await fetch(
          `/api/features/profile/${selectedLocationId}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to load profile (${response.status})`);
        }

        const payload: BusinessProfilePayload = await response.json();
        if (!isMounted) return;

        // Debug logging
        if (process.env.NODE_ENV !== "production") {
          console.log("[Business Info] Received profile data:", {
            locationName: payload.locationName,
            description: payload.description?.substring(0, 100),
            phone: payload.phone,
            website: payload.website,
            primaryCategory: payload.primaryCategory,
            additionalCategories: payload.additionalCategories,
            specialLinks: payload.specialLinks,
            socialLinks: payload.socialLinks,
            features: {
              amenities: payload.features?.amenities?.length || 0,
              payment_methods: payload.features?.payment_methods?.length || 0,
              services: payload.features?.services?.length || 0,
              atmosphere: payload.features?.atmosphere?.length || 0,
            },
            fromTheBusiness: payload.fromTheBusiness,
            openingDate: payload.openingDate,
            serviceAreaEnabled: payload.serviceAreaEnabled,
          });
        }

        setProfile(payload);
        setInitialProfile(payload);
      } catch (error: unknown) {
        if (!isMounted) return;
        const isError = error instanceof Error;
        const message = isError
          ? error.message
          : "Failed to load business profile";
        setProfileError(message);
        toast.error(message);
        setProfile(null);
        setInitialProfile(null);
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [selectedLocationId]);

  const hasChanges = useMemo(() => {
    if (!profile || !initialProfile) return false;
    return fingerprint(profile) !== fingerprint(initialProfile);
  }, [profile, initialProfile]);

  const handleProfileChange = (next: BusinessProfilePayload) => {
    setProfile((prev) => {
      if (!prev) {
        return { ...next };
      }
      return { ...prev, ...next };
    });
  };

  const markDirty = () => {
    // no-op: change detection handled via fingerprint comparison
  };

  const handleSave = async () => {
    if (!selectedLocationId || !profile) {
      return;
    }

    try {
      setSaveLoading(true);
      const response = await fetch(
        `/api/features/profile/${selectedLocationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profile),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to save profile (${response.status})`);
      }

      const payload: BusinessProfilePayload = await response.json();
      setProfile(payload);
      setInitialProfile(payload);
      toast.success(t("saved"));
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (error: unknown) {
      const isError = error instanceof Error;
      const message = isError ? error.message : t("saveError");
      toast.error(message);
    } finally {
      setSaveLoading(false);
    }
  };

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId) return "Select a location";
    return (
      locations.find((location) => location.id === selectedLocationId)?.name ??
      "Select a location"
    );
  }, [locations, selectedLocationId]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
            <p className="text-zinc-400">{t("subtitle")}</p>
            {snapshotError && (
              <p className="mt-2 text-sm text-red-400">
                Failed to load dashboard data. Some information may be
                incomplete.
              </p>
            )}
          </div>

          <div className="flex gap-3 flex-wrap justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!selectedLocationId) return;

                const loadingToast = toast.loading("Importing from GMB...");

                try {
                  // First get the account ID for this location
                  const locationData = locations.find(
                    (l) => l.id === selectedLocationId,
                  );
                  if (!locationData) {
                    throw new Error("Location not found");
                  }

                  const response = await fetch("/api/gmb/sync-v2", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      accountId: locationData.accountId,
                      locationIds: [selectedLocationId],
                      syncType: "locations",
                    }),
                  });

                  const data = await response.json().catch(() => ({}));

                  if (response.ok) {
                    toast.success("Successfully imported from GMB", {
                      id: loadingToast,
                      description: "Refreshing page...",
                    });
                    // Hard reload to ensure fresh data
                    setTimeout(() => {
                      window.location.reload();
                    }, 1500);
                  } else {
                    toast.error(
                      data.error || `Import failed (${response.status})`,
                      {
                        id: loadingToast,
                      },
                    );
                    console.error("[Import GMB] Error:", data);
                  }
                } catch (error) {
                  console.error("[Import GMB] Exception:", error);
                  toast.error("Import failed - please check your connection", {
                    id: loadingToast,
                  });
                }
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Import from GMB
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkUpdateOpen(true)}
              disabled={locations.length < 2}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Bulk Update
            </Button>
            <button
              type="button"
              onClick={() => {
                if (initialProfile) {
                  setProfile(cloneProfilePayload(initialProfile));
                  toast.info("Unsaved changes reverted");
                }
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-medium transition text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              disabled={profileLoading || !initialProfile || !hasChanges}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t("reset")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!profile || !hasChanges || saveLoading}
              className={`px-6 py-3 rounded-lg font-medium transition inline-flex items-center ${
                profile && hasChanges && !saveLoading
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {saveLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t("saveChanges")}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          {snapshotLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <select
              className="w-full md:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              value={selectedLocationId ?? ""}
              onChange={(event) =>
                setSelectedLocationId(event.target.value || null)
              }
            >
              {locations.length === 0 && (
                <option value="">No connected locations</option>
              )}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-zinc-500 mt-2">
            {t("currentlyEditing")}: {selectedLocationName}
          </p>
        </div>

        {profileLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : profile ? (
          <ProfileCompletenessCard
            completeness={profile.profileCompleteness}
            breakdown={profile.profileCompletenessBreakdown}
          />
        ) : (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            <p className="font-medium">
              {profileError ?? "Select a location to view profile details."}
            </p>
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-zinc-800 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-orange-600 text-white border-b-2 border-orange-500"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                {tab.icon === "FileText" && <FileText className="w-5 h-5" />}
                {tab.icon === "Sparkles" && <Sparkles className="w-5 h-5" />}
                {tab.icon === "Shield" && <Shield className="w-5 h-5" />}
                {tab.icon === "History" && <History className="w-5 h-5" />}
                <span>
                  {tab.id === "info"
                    ? t("tabs.basicInfo")
                    : tab.id === "features"
                      ? t("tabs.features")
                      : tab.id === "validation"
                        ? "Validation"
                        : "History"}
                </span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <span className="ml-3 text-zinc-400">
                  Loading profile data...
                </span>
              </div>
            ) : profile ? (
              <>
                {activeTab === "info" && (
                  <BusinessInfoTab
                    profile={profile}
                    onChange={handleProfileChange}
                    onDirty={markDirty}
                    disabled={false}
                  />
                )}
                {activeTab === "features" && (
                  <FeaturesTab
                    profile={profile}
                    onChange={handleProfileChange}
                    onDirty={markDirty}
                    disabled={false}
                  />
                )}
                {activeTab === "validation" && selectedLocationId && (
                  <ValidationPanel
                    profile={profile}
                    onChange={handleProfileChange}
                    onDirty={markDirty}
                    locationName={selectedLocationName}
                    disabled={false}
                  />
                )}
                {activeTab === "history" && selectedLocationId && (
                  <ChangeHistoryPanel
                    locationId={selectedLocationId}
                    locationName={selectedLocationName}
                    onRollback={() => {
                      // Reload profile after rollback
                      setSelectedLocationId(null);
                      setTimeout(
                        () => setSelectedLocationId(selectedLocationId),
                        100,
                      );
                    }}
                  />
                )}

                {/* Business Hours & Service Items - Show on info tab */}
                {activeTab === "info" && profile && (
                  <div className="mt-6 space-y-6">
                    <BusinessHoursDisplay
                      regularHours={profile.regularHours}
                      moreHours={
                        Array.isArray(profile.moreHours)
                          ? profile.moreHours
                          : undefined
                      }
                    />
                    <ServiceItemsDisplay />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
                <p className="font-medium">
                  {profileError ||
                    "No profile data available. Please select a location."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        open={bulkUpdateOpen}
        onOpenChange={setBulkUpdateOpen}
        selectedLocations={locations.map((loc) => ({
          id: loc.id,
          name: loc.name,
        }))}
        onComplete={() => {
          // Refresh data after bulk update
          window.dispatchEvent(new Event("dashboard:refresh"));
        }}
      />
    </div>
  );
}
