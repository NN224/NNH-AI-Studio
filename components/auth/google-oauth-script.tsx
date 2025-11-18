'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface GoogleOAuthScriptProps {
  clientId?: string;
  onLoad?: () => void;
}

export function GoogleOAuthScript({ clientId, onLoad }: GoogleOAuthScriptProps) {
  const GOOGLE_CLIENT_ID = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[GoogleOAuthScript] No client ID provided');
      return;
    }

    // Initialize Google OAuth when script loads
    const initializeGoogleOAuth = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              console.log('[GoogleOAuth] Sign-in response:', response);
            },
          });
          
          if (onLoad) {
            onLoad();
          }
        } catch (error) {
          console.error('[GoogleOAuth] Initialization failed:', error);
        }
      }
    };

    // Check if Google script is already loaded
    if ((window as any).google) {
      initializeGoogleOAuth();
    } else {
      // Wait for script to load
      const checkGoogle = setInterval(() => {
        if ((window as any).google) {
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
        onLoad={() => {
          console.log('[GoogleOAuth] Script loaded successfully');
        }}
        onError={(error) => {
          console.error('[GoogleOAuth] Script failed to load:', error);
        }}
      />
    </>
  );
}

// Helper function to trigger Google sign-in
export function triggerGoogleSignIn(options?: {
  callback?: (response: any) => void;
  prompt?: boolean;
}) {
  if (typeof window !== 'undefined' && (window as any).google) {
    try {
      if (options?.callback) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: options.callback,
        });
      }
      
      (window as any).google.accounts.id.prompt((notification: any) => {
        console.log('[GoogleOAuth] Prompt notification:', notification);
      });
    } catch (error) {
      console.error('[GoogleOAuth] Sign-in failed:', error);
    }
  } else {
    console.warn('[GoogleOAuth] Google script not loaded');
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google: any;
  }
}
