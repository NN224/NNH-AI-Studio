import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Star, BarChart3, CheckCircle2, Sparkles, TrendingUpIcon, Shield, Users, Plus
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { toast } from 'sonner';

// No GMB Account Banner Component
export const GMBConnectionBanner = () => {
  const t = useTranslations('Locations');
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  // Added loading state management for GMB connection API call
  const handleConnectGMB = async () => {
    setIsConnecting(true); // Start loading state
    try {
      const res = await fetch('/api/gmb/create-auth-url');
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error('Failed to create auth URL');
      }
    } catch (error) {
      console.error('Error connecting to GMB:', error);
      toast.error('Failed to connect to Google My Business');
    } finally {
      setIsConnecting(false); // End loading state
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                <div className="relative bg-primary/10 p-6 rounded-full">
                  <MapPin className="w-16 h-16 text-primary" />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight">{t('noAccount.title')}</h1>
              <p className="text-xl text-muted-foreground">{t('noAccount.subtitle')}</p>
            </div>

            {/* Benefits Grid */}
            <div className="mt-8 mb-8">
              <h3 className="text-lg font-semibold mb-6 text-primary">{t('noAccount.benefits.title')}</h3>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t('noAccount.benefits.manage')}</span>
                </div>
                <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t('noAccount.benefits.respond')}</span>
                </div>
                <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                  <TrendingUpIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t('noAccount.benefits.track')}</span>
                </div>
                <div className="flex gap-3 p-4 rounded-lg bg-background border border-primary/10 hover:border-primary/30 transition-colors">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t('noAccount.benefits.optimize')}</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto text-base px-8"
                onClick={handleConnectGMB}
                disabled={isConnecting}
              >
                <Users className="w-5 h-5 mr-2" />
                {isConnecting ? 'Connecting...' : t('noAccount.connectButton')}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push('/features')}
              >
                {t('noAccount.learnMore')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Multi-Location Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage all your business locations from a single, unified dashboard with real-time updates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">AI-Powered Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Respond to customer reviews instantly with AI-generated, personalized responses.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Advanced Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track performance metrics, customer insights, and growth trends across all locations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Empty state component
export const EmptyLocationsState = ({ 
  hasFilters, 
  onAddLocationAction 
}: { 
  hasFilters: boolean; 
  onAddLocationAction: () => void; 
}) => {
  const t = useTranslations('Locations');

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('empty.title')}</h3>
        <p className="text-muted-foreground text-center mb-4">
          {hasFilters
            ? t('empty.filteredMessage')
            : t('empty.defaultMessage')}
        </p>
        <Button onClick={onAddLocationAction}>
          <Plus className="w-4 h-4 mr-2" />
          {t('actions.addLocation')}
        </Button>
      </CardContent>
    </Card>
  );
};