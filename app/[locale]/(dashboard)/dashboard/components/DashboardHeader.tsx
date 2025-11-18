'use client';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useResponsiveLayout } from '@/components/dashboard/responsive-layout';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DashboardCustomizationModal } from '@/components/dashboard/dashboard-customization-modal';
import { type DashboardWidgetPreferences } from '@/lib/dashboard-preferences';

interface DashboardHeaderProps {
  onPreferencesChange?: (preferences: DashboardWidgetPreferences) => void;
}

export function DashboardHeader({ onPreferencesChange }: DashboardHeaderProps) {
  const { isMobile } = useResponsiveLayout();
  const [userName, setUserName] = useState<string>('');
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          // Extract name from email or use email prefix
          const emailPrefix = user.email.split('@')[0];
          // Capitalize first letter
          const displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          setUserName(displayName);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };

    fetchUserName();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning');
    if (hour < 18) return t('greeting.afternoon');
    return t('greeting.evening');
  };

  const handlePreferencesSave = (preferences: DashboardWidgetPreferences) => {
    if (onPreferencesChange) {
      onPreferencesChange(preferences);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={cn("font-bold tracking-tight", isMobile ? "text-2xl" : "text-3xl")}>
            {t('header.title')}
          </h1>
          {userName && (
            <p className="text-primary font-medium text-sm md:text-base mt-1">
              {getGreeting()}, {userName}! {t('header.subtitle')}
            </p>
          )}
          <p className="text-muted-foreground text-sm md:text-base mt-1 md:mt-2">
            {t('header.description')}
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={() => setIsCustomizationOpen(true)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            {t('header.customize')}
          </Button>
        </div>
      </div>

      <DashboardCustomizationModal
        isOpen={isCustomizationOpen}
        onClose={() => setIsCustomizationOpen(false)}
        onSave={handlePreferencesSave}
      />
    </>
  );
}
