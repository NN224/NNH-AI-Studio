'use client';

import { useEffect } from 'react';
import { useBrandProfile } from '@/contexts/BrandProfileContext';

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, refetchProfile } = useBrandProfile();

  useEffect(() => {
    // Listen for brand profile updates
    const handleBrandUpdate = () => {
      refetchProfile();
    };

    window.addEventListener('brand-profile-updated', handleBrandUpdate);
    return () => window.removeEventListener('brand-profile-updated', handleBrandUpdate);
  }, [refetchProfile]);

  useEffect(() => {
    // Apply CSS variables for dynamic theming
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      if (profile?.primary_color) {
        root.style.setProperty('--brand-primary', profile.primary_color);
      } else {
        root.style.setProperty('--brand-primary', '#FFA500');
      }
      
      if (profile?.secondary_color) {
        root.style.setProperty('--brand-secondary', profile.secondary_color);
      } else {
        root.style.setProperty('--brand-secondary', '#1A1A1A');
      }
    }
  }, [profile]);

  return <>{children}</>;
}
