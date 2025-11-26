"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Check, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface GMBAccount {
  id: string;
  account_id: string;
  account_name: string;
  email: string;
  location_count?: number;
  locations?: Array<{
    id: string;
    location_name: string;
    address: string | null;
  }>;
}

export default function SelectAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<GMBAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch("/api/gmb/accounts");

        if (!response.ok) {
          throw new Error("Failed to load accounts");
        }

        const data = await response.json();
        const accountsData = data.accounts || [];

        if (accountsData.length === 0) {
          toast.error("No accounts found");
          router.push("/home");
          return;
        }

        // If only one account, auto-select and redirect
        if (accountsData.length === 1) {
          await selectAccount(accountsData[0].id);
          return;
        }

        setAccounts(accountsData);
      } catch (error) {
        console.error("Error loading accounts:", error);
        toast.error("Failed to load accounts");
        router.push("/home");
      } finally {
        setIsLoading(false);
      }
    }

    loadAccounts();
  }, [router]);

  const selectAccount = async (accountId: string) => {
    setIsSelecting(true);
    setSelectedAccountId(accountId);

    try {
      // Set as primary account
      const response = await fetch("/api/gmb/accounts/set-primary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        throw new Error("Failed to set primary account");
      }

      // Add to sync queue
      const syncResponse = await fetch("/api/gmb/enqueue-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId, syncType: "full" }),
      });

      if (!syncResponse.ok) {
        console.warn("Failed to enqueue sync, but continuing...");
      }

      toast.success("Account selected successfully!");

      // Redirect to home with newUser flag
      router.push(`/home?newUser=true&accountId=${accountId}`);
    } catch (error) {
      console.error("Error selecting account:", error);
      toast.error("Failed to select account");
      setIsSelecting(false);
      setSelectedAccountId(null);
    }
  };

  if (isLoading) {
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

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
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
            You have multiple Google My Business accounts. Choose the one you'd
            like to manage with NNH AI Studio.
          </p>
        </div>

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
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  selectedAccountId === account.id
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => !isSelecting && selectAccount(account.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
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
                    {selectedAccountId === account.id && isSelecting && (
                      <div className="p-2 rounded-full bg-primary text-primary-foreground">
                        {isSelecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {account.locations && account.locations.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {account.locations.length} location
                          {account.locations.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {account.locations.slice(0, 3).map((location) => (
                          <div key={location.id} className="text-sm">
                            <p className="font-medium text-foreground">
                              {location.location_name}
                            </p>
                            {location.address && (
                              <p className="text-xs text-muted-foreground truncate">
                                {location.address}
                              </p>
                            )}
                          </div>
                        ))}
                        {account.locations.length > 3 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{account.locations.length - 3} more location
                            {account.locations.length - 3 !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No locations found
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Help Text */}
        <div className="text-center">
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
        </div>
      </motion.div>
    </div>
  );
}
