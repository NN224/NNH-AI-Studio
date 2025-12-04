"use client";

import { BusinessSetupScreen } from "@/components/onboarding/business-setup-screen";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const accountId = searchParams.get("accountId");
  const businessName = searchParams.get("businessName") || "Your Business";

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Validate we have required params
    if (!accountId) {
      router.push("/home");
      return;
    }
    setIsReady(true);
  }, [accountId, router]);

  const handleComplete = () => {
    // Invalidate React Query caches to ensure fresh data
    queryClient.invalidateQueries();

    // Go to home - home page will see the new locations in DB
    // NO cookies needed! Home page checks DB directly.
    router.push("/home");
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <BusinessSetupScreen
      businessName={decodeURIComponent(businessName)}
      accountId={accountId!}
      onComplete={handleComplete}
    />
  );
}
