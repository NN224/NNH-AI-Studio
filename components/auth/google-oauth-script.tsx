"use client";

import { useEffect } from "react";
import Script from "next/script";

interface GoogleOAuthScriptProps {
  clientId?: string;
  onLoad?: () => void;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getMomentType: () => string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    prompt: (
      callback?: (notification: GooglePromptNotification) => void,
    ) => void;
  };
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

export function GoogleOAuthScript({
  clientId,
  onLoad,
}: GoogleOAuthScriptProps) {
  const GOOGLE_CLIENT_ID = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn("[GoogleOAuthScript] No client ID provided");
      return;
    }

    // Initialize Google OAuth when script loads
    const initializeGoogleOAuth = () => {
      if (typeof window !== "undefined" && window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (_response: GoogleCredentialResponse) => {
              // Sign-in response handled
            },
          });

          if (onLoad) {
            onLoad();
          }
        } catch (error) {
          console.error("[GoogleOAuth] Initialization failed:", error);
        }
      }
    };

    // Check if Google script is already loaded
    if (window.google) {
      initializeGoogleOAuth();
    } else {
      // Wait for script to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          initializeGoogleOAuth();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogle), 10000);
    }
  }, [GOOGLE_CLIENT_ID, onLoad]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onError={(error) => {
          console.error("[GoogleOAuth] Script failed to load:", error);
        }}
      />
    </>
  );
}

// Helper function to trigger Google sign-in
export function triggerGoogleSignIn(options?: {
  callback?: (response: GoogleCredentialResponse) => void;
  prompt?: boolean;
}) {
  if (typeof window !== "undefined" && window.google) {
    try {
      if (options?.callback) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
          callback: options.callback,
        });
      }

      window.google.accounts.id.prompt();
    } catch (error) {
      console.error("[GoogleOAuth] Sign-in failed:", error);
    }
  } else {
    console.warn("[GoogleOAuth] Google script not loaded");
  }
}
