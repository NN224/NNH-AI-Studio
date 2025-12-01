"use client";

import { Button } from "@/components/ui/button";
import { apiLogger } from "@/lib/utils/logger";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ProfileProtectionButton() {
  const router = useRouter();

  const handleManage = () => {
    try {
      router.push("/settings");
      toast.success("Navigated to Settings successfully!");
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (error) {
      apiLogger.error(
        "[ProfileProtectionButton] Navigation error",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error("Failed to navigate to Settings. Please try again.");
    }
  };

  return (
    <Button
      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
      onClick={handleManage}
    >
      🛡️ Manage Protection
    </Button>
  );
}
