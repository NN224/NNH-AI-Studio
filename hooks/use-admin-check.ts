import { useEffect, useState } from "react";

interface AdminCheckResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to check if current user has admin privileges
 */
export function useAdminCheck(): AdminCheckResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/diagnostics/admin-check");

        if (response.ok) {
          setIsAdmin(true);
        } else if (response.status === 403) {
          setIsAdmin(false);
        } else {
          setIsAdmin(false);
          setError("Failed to check admin access");
        }
      } catch (err) {
        setIsAdmin(false);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminAccess();
  }, []);

  return { isAdmin, isLoading, error };
}
