'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, Star, MapPin, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useResponsiveLayout } from '@/components/dashboard/responsive-layout';

export function GMBConnectionBanner() {
  const { isMobile } = useResponsiveLayout();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Call the existing GMB auth URL endpoint
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start GMB connection');
      }
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url;
      } else {
        throw new Error('No OAuth URL returned');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect. Please try again or go to Settings.');
      setConnecting(false);
      // Fallback to settings page
      router.push('/settings');
    }
  };
  
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <CardContent className={cn("p-4 md:p-8")}>
        <div className={cn(
          "flex gap-4 md:gap-6",
          isMobile ? "flex-col items-start" : "flex-col lg:flex-row items-start lg:items-center"
        )}>
          {/* Icon and Title */}
          <div className="flex items-start gap-3 md:gap-4 flex-1">
            <div className={cn(
              "rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20",
              isMobile ? "w-12 h-12" : "w-16 h-16"
            )}>
              <MapPin className={cn("text-primary", isMobile ? "w-6 h-6" : "w-8 h-8")} />
            </div>
            <div className="space-y-2 flex-1">
              <h2 className={cn("font-bold text-foreground", isMobile ? "text-xl" : "text-2xl")}>
                Connect Your Google My Business
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                Connect your GMB account to start managing your locations, reviews, and more.
              </p>
              
              {/* Benefits Grid - مُحسَّن للموبايل */}
              <div className={cn(
                "grid gap-2 md:gap-4 pt-3 md:pt-4",
                isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
              )}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">{t('benefit1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">{t('benefit2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-foreground">{t('benefit3')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons - مُحسَّن للموبايل */}
          <div className={cn(
            "flex gap-2 md:gap-3 w-full lg:w-auto lg:flex-shrink-0",
            isMobile ? "flex-col" : "flex-col sm:flex-row"
          )}>
            <Button 
              size={isMobile ? "default" : "lg"} 
              className="gap-2 gradient-orange"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 md:w-5 md:h-5" />
                  Connect Google My Business
                </>
              )}
            </Button>
            <Button asChild size={isMobile ? "default" : "lg"} variant="outline" className="gap-2">
              <a 
                href="https://business.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Star className="w-4 h-4 md:w-5 md:h-5" />
                Learn More
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
