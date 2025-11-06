"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/error-boundary';
import { LocationsOverviewTab } from '@/components/locations/locations-overview-tab';
import { LocationsMapTab } from '@/components/locations/locations-map-tab-new';
import { LocationsAnalyticsTab } from '@/components/locations/locations-analytics-tab';
import { MapPin, BarChart3, LayoutGrid } from 'lucide-react';

export default function LocationsPage() {
  const t = useTranslations('Locations');
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <ErrorBoundary>
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
              <p className="text-muted-foreground mt-2">
                {t('subtitle') || 'Manage and monitor all your business locations'}
              </p>
            </div>
          </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass-strong border-primary/30">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Map View
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <LocationsOverviewTab />
          </TabsContent>

          {/* Map View Tab */}
          <TabsContent value="map" className="space-y-6 mt-6">
            <LocationsMapTab />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <LocationsAnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}