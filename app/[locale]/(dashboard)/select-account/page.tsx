"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressStepper } from "@/components/ui/progress-stepper";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  Globe,
  Home,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  SkipForward,
  Tag,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { gmbLogger } from "@/lib/utils/logger";

// ============================================================================
// Types
// ============================================================================

interface GMBAccount {
  id: string;
  account_id: string;
  account_name: string;
  email: string;
}

interface GoogleAddress {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
}

interface GoogleLocation {
  name: string;
  title?: string;
  storefrontAddress?: GoogleAddress;
  phoneNumbers?: {
    primaryPhone?: string;
  };
  websiteUri?: string;
  categories?: {
    primaryCategory?: {
      displayName?: string;
    };
  };
}

type WizardStep = "select-account" | "select-locations" | "importing";

// ============================================================================
// Constants
// ============================================================================

const ONBOARDING_STEPS = [
  { id: "connect", title: "Connect", description: "OAuth complete" },
  { id: "account", title: "Account", description: "Select account" },
  { id: "locations", title: "Locations", description: "Choose locations" },
  { id: "done", title: "Done", description: "Start managing" },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatAddress(address?: GoogleAddress): string | null {
  if (!address) return null;
  const parts = [
    address.addressLines?.join(", "),
    address.locality,
    address.administrativeArea,
    address.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function getStepIndex(step: WizardStep): number {
  switch (step) {
    case "select-account":
      return 1;
    case "select-locations":
      return 2;
    case "importing":
      return 3;
    default:
      return 1;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function SelectAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params from OAuth callback
  const urlAccountId = searchParams.get("accountId");
  const userState = searchParams.get("userState");

  // Wizard state
  const [step, setStep] = useState<WizardStep>("select-account");
  const [accounts, setAccounts] = useState<GMBAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GMBAccount | null>(
    null,
  );

  // Locations state
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [selectedLocationNames, setSelectedLocationNames] = useState<
    Set<string>
  >(new Set());

  // Loading states
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // -------------------------------------------------------------------------
  // Load accounts on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/gmb/accounts");
        if (!response.ok) {
          throw new Error("Failed to load accounts");
        }

        const data = await response.json();
        const accountsData: GMBAccount[] = data.accounts || [];

        if (accountsData.length === 0) {
          toast.error("No accounts found. Please connect your Google account.");
          router.push("/settings");
          return;
        }

        setAccounts(accountsData);

        // Auto-select account if provided in URL or only one account exists
        const accountToSelect =
          accountsData.find((a) => a.id === urlAccountId) ||
          (accountsData.length === 1 ? accountsData[0] : null);

        if (accountToSelect) {
          setSelectedAccount(accountToSelect);
          setStep("select-locations");
        }
      } catch (err) {
        gmbLogger.error(
          "Error loading accounts",
          err instanceof Error ? err : new Error(String(err)),
        );
        setError("Failed to load accounts. Please try again.");
      } finally {
        setIsLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [router, urlAccountId]);

  // -------------------------------------------------------------------------
  // Fetch locations when account is selected
  // -------------------------------------------------------------------------
  const fetchLocations = useCallback(async (accountId: string) => {
    setIsLoadingLocations(true);
    setError(null);
    setLocations([]);
    setSelectedLocationNames(new Set());

    try {
      const response = await fetch("/api/gmb/locations/fetch-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      // Check content type before parsing
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error(
            "Your Google session has expired. Please reconnect your account.",
          );
        }

        // Handle non-JSON responses
        if (!contentType?.includes("application/json")) {
          const text = await response.text();
          gmbLogger.error(
            "Non-JSON error response",
            new Error(text.slice(0, 500)),
            {
              status: response.status,
              contentType,
              accountId,
            },
          );
          throw new Error(
            `Server error (${response.status}). Please try again.`,
          );
        }

        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to fetch locations",
        );
      }

      // Also check for JSON response on success
      if (!contentType?.includes("application/json")) {
        throw new Error("Invalid response from server. Please try again.");
      }

      const data = await response.json();
      const fetchedLocations: GoogleLocation[] = data.locations || [];

      setLocations(fetchedLocations);

      // Auto-select all locations by default
      setSelectedLocationNames(new Set(fetchedLocations.map((l) => l.name)));
    } catch (err) {
      gmbLogger.error(
        "Error fetching locations",
        err instanceof Error ? err : new Error(String(err)),
        { accountId },
      );
      setError(
        err instanceof Error ? err.message : "Failed to fetch locations",
      );
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  // Fetch locations when step changes to select-locations
  useEffect(() => {
    if (step === "select-locations" && selectedAccount) {
      fetchLocations(selectedAccount.id);
    }
  }, [step, selectedAccount, fetchLocations]);

  // -------------------------------------------------------------------------
  // Selection handlers
  // -------------------------------------------------------------------------
  const handleSelectAccount = (account: GMBAccount) => {
    setSelectedAccount(account);
    setStep("select-locations");
  };

  const handleToggleLocation = (locationName: string) => {
    setSelectedLocationNames((prev) => {
      const next = new Set(prev);
      if (next.has(locationName)) {
        next.delete(locationName);
      } else {
        next.add(locationName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedLocationNames(new Set(locations.map((l) => l.name)));
  };

  const handleDeselectAll = () => {
    setSelectedLocationNames(new Set());
  };

  const handleBack = () => {
    if (accounts.length > 1) {
      setStep("select-account");
      setSelectedAccount(null);
      setLocations([]);
      setSelectedLocationNames(new Set());
      setError(null);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    if (selectedAccount) {
      fetchLocations(selectedAccount.id);
    }
  };

  const handleReconnect = () => {
    // Redirect to settings to reconnect Google account
    router.push("/settings?reconnect=true");
  };

  const handleSkip = () => {
    toast.info("You can add locations later from the Settings page.", {
      duration: 4000,
    });
    router.push("/home");
  };

  // -------------------------------------------------------------------------
  // Import selected locations
  // -------------------------------------------------------------------------
  const handleImport = async () => {
    if (!selectedAccount || selectedLocationNames.size === 0) return;

    setIsImporting(true);
    setStep("importing");
    setError(null);

    try {
      // Get the full location objects for selected names
      const selectedLocations = locations.filter((l) =>
        selectedLocationNames.has(l.name),
      );

      const response = await fetch("/api/gmb/locations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          locations: selectedLocations,
        }),
      });

      // Check content type before parsing
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        // Handle non-JSON responses (e.g., HTML error pages)
        if (!contentType?.includes("application/json")) {
          const text = await response.text();
          gmbLogger.error(
            "Non-JSON error response",
            new Error(text.slice(0, 500)),
            {
              status: response.status,
              contentType,
            },
          );
          throw new Error(
            `Server error (${response.status}). Please try again.`,
          );
        }

        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            errorData.message ||
            "Failed to import locations",
        );
      }

      // Also check for JSON response on success
      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        gmbLogger.error(
          "Non-JSON success response",
          new Error(text.slice(0, 500)),
        );
        throw new Error("Invalid response from server. Please try again.");
      }

      const result = await response.json();

      toast.success(
        `Successfully imported ${result.importedCount} location${result.importedCount !== 1 ? "s" : ""}! 🎉`,
        {
          description: "Your data is now syncing in the background.",
          duration: 5000,
        },
      );

      // Redirect to dashboard
      router.push("/dashboard?newUser=true");
    } catch (err) {
      gmbLogger.error(
        "Error importing locations",
        err instanceof Error ? err : new Error(String(err)),
        {
          accountId: selectedAccount.id,
          selectedCount: selectedLocationNames.size,
        },
      );
      setError(
        err instanceof Error ? err.message : "Failed to import locations",
      );
      setStep("select-locations");
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render: Loading state
  // -------------------------------------------------------------------------
  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your accounts...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Importing state
  // -------------------------------------------------------------------------
  if (step === "importing") {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        {/* Progress Stepper */}
        <ProgressStepper
          steps={ONBOARDING_STEPS}
          currentStep={3}
          className="mb-12"
        />

        <div className="flex items-center justify-center min-h-[40vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative p-6 rounded-full bg-primary/10 border border-primary/20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Importing & Syncing...</h2>
              <p className="text-muted-foreground max-w-md">
                We're importing your selected locations and starting the initial
                sync. This may take a moment.
              </p>
            </div>

            {/* Progress indicators */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Saving locations</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span>Starting sync</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Select Account step
  // -------------------------------------------------------------------------
  if (step === "select-account") {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        {/* Progress Stepper */}
        <ProgressStepper
          steps={ONBOARDING_STEPS}
          currentStep={1}
          className="mb-12"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Building2 className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Select Your Business Account
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              You have multiple Google Business accounts. Choose the one you'd
              like to manage.
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </motion.div>
          )}

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
                  onClick={() => handleSelectAccount(account)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {account.account_name || "Business Account"}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {account.email}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Help Text & Skip */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't see your account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => router.push("/settings")}
              >
                Try connecting again
              </Button>
            </p>

            {/* Skip Option */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Select Locations step
  // -------------------------------------------------------------------------
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Progress Stepper */}
      <ProgressStepper
        steps={ONBOARDING_STEPS}
        currentStep={2}
        className="mb-12"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="space-y-4">
          {accounts.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to accounts
            </Button>
          )}
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <MapPin className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Select Locations to Import
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose which locations from{" "}
              <span className="font-medium text-foreground">
                {selectedAccount?.account_name || "your account"}
              </span>{" "}
              you'd like to manage.
            </p>
          </div>
        </div>

        {/* Error with Recovery Options */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium text-destructive">
                    Connection Issue
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Try Again
                  </Button>

                  {error.includes("expired") || error.includes("reconnect") ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReconnect}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Reconnect Account
                    </Button>
                  ) : null}

                  <Button variant="ghost" size="sm" onClick={handleSkip}>
                    <Home className="h-4 w-4 mr-1" />
                    Go to Home
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading locations */}
        {isLoadingLocations && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Fetching locations from Google...
              </p>
            </div>
          </div>
        )}

        {/* No locations found */}
        {!isLoadingLocations && locations.length === 0 && !error && (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Locations Found</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  This Google Business account doesn't have any locations yet.
                  Please add locations in Google Business Profile first.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open("https://business.google.com", "_blank")
                  }
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Open Google Business
                </Button>
                <Button variant="ghost" onClick={handleSkip}>
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Locations list */}
        {!isLoadingLocations && locations.length > 0 && (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Selected{" "}
                <span className="font-medium text-foreground">
                  {selectedLocationNames.size}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {locations.length}
                </span>{" "}
                locations
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={selectedLocationNames.size === locations.length}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedLocationNames.size === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Locations grid */}
            <div className="grid grid-cols-1 gap-4">
              {locations.map((location, index) => {
                const isSelected = selectedLocationNames.has(location.name);
                const address = formatAddress(location.storefrontAddress);

                return (
                  <motion.div
                    key={location.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => handleToggleLocation(location.name)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleToggleLocation(location.name)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-foreground">
                                {location.title || "Unnamed Location"}
                              </h3>
                              {isSelected && (
                                <div className="p-1 rounded-full bg-primary text-primary-foreground">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {address && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{address}</span>
                                </div>
                              )}
                              {location.phoneNumbers?.primaryPhone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    {location.phoneNumbers.primaryPhone}
                                  </span>
                                </div>
                              )}
                              {location.categories?.primaryCategory
                                ?.displayName && (
                                <div className="flex items-center gap-1.5">
                                  <Tag className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    {
                                      location.categories.primaryCategory
                                        .displayName
                                    }
                                  </span>
                                </div>
                              )}
                              {location.websiteUri && (
                                <div className="flex items-center gap-1.5">
                                  <Globe className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    {location.websiteUri.replace(
                                      /^https?:\/\//,
                                      "",
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={handleImport}
                disabled={selectedLocationNames.size === 0 || isImporting}
                className="gap-2 min-w-[250px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Connect {selectedLocationNames.size} Location
                    {selectedLocationNames.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>

              {/* Skip Option */}
              <Button
                variant="ghost"
                size="lg"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip for now
              </Button>
            </div>
          </>
        )}

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            You can add more locations later from the Settings page.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
