'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Star, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LocationHighlight {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  pendingReviews: number;
  ratingChange?: number;
  category: 'top' | 'attention' | 'improved';
}

interface LocationHighlightsCarouselProps {
  locations: LocationHighlight[];
  loading?: boolean;
  locale?: string;
}

export function LocationHighlightsCarousel({
  locations,
  loading = false,
  locale = 'en'
}: LocationHighlightsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isArabic = locale === 'ar';

  // Auto-rotate carousel
  useEffect(() => {
    if (locations.length <= 1) return;
    
    const timer = setInterval(() => {
      setNextAnimate();
    }, 5000); // كل 5 ثواني

    return () => clearInterval(timer);
  }, [currentIndex, locations.length]);

  const setNext = () => {
    setCurrentIndex((prev) => (prev + 1) % locations.length);
  };

  const setPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + locations.length) % locations.length);
  };

  const setNextAnimate = () => {
    setCurrentIndex((prev) => (prev + 1) % locations.length);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'أبرز المواقع' : 'Location Highlights'}</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            {isArabic ? 'جاري التحميل...' : 'Loading...'}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'أبرز المواقع' : 'Location Highlights'}</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex flex-col items-center justify-center text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentLocation = locations[currentIndex];

  const categoryConfig = {
    top: {
      label: isArabic ? '🏆 الأفضل أداءً' : '🏆 Top Performer',
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5',
      borderColor: 'border-yellow-500/30',
      description: isArabic ? 'أعلى تقييم بين جميع المواقع' : 'Highest rating across all locations'
    },
    attention: {
      label: isArabic ? '⚠️ يحتاج اهتمام' : '⚠️ Needs Attention',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-500/10 to-red-600/5',
      borderColor: 'border-red-500/30',
      description: isArabic ? 'يتطلب ردوداً أو تحسينات' : 'Requires responses or improvements'
    },
    improved: {
      label: isArabic ? '📈 الأكثر تحسناً' : '📈 Most Improved',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-500/10 to-green-600/5',
      borderColor: 'border-green-500/30',
      description: isArabic ? 'أكبر تحسن في التقييم' : 'Biggest rating improvement'
    }
  };

  const config = categoryConfig[currentLocation.category];
  const Icon = config.icon;

  return (
    <Card className={cn("border-2", config.borderColor)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {isArabic ? 'أبرز المواقع' : 'Location Highlights'}
          </CardTitle>
          
          {locations.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={setPrevious}
                className="h-8 w-8"
              >
                <ChevronLeft className={cn("w-4 h-4", isArabic && "rotate-180")} />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {locations.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={setNext}
                className="h-8 w-8"
              >
                <ChevronRight className={cn("w-4 h-4", isArabic && "rotate-180")} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLocation.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn("p-6 rounded-lg", config.bgColor)}
          >
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className={cn("p-2 rounded-lg bg-background/80", config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{config.label}</h3>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-3">
              <div>
                <h4 className="text-lg font-bold text-foreground mb-1">
                  {currentLocation.name}
                </h4>
                
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{currentLocation.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">/ 5.0</span>
                  </div>

                  {/* Review Count */}
                  <div className="text-sm text-muted-foreground">
                    {currentLocation.reviewCount} {isArabic ? 'مراجعات' : 'reviews'}
                  </div>

                  {/* Rating Change */}
                  {currentLocation.ratingChange !== undefined && currentLocation.ratingChange !== 0 && (
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      currentLocation.ratingChange > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {currentLocation.ratingChange > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {currentLocation.ratingChange > 0 ? '+' : ''}
                      {currentLocation.ratingChange.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Reviews Alert */}
              {currentLocation.pendingReviews > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    {currentLocation.pendingReviews} {isArabic ? 'مراجعات معلقة' : 'pending reviews'}
                  </span>
                </div>
              )}

              {/* Action Button */}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/locations?id=${currentLocation.id}`}>
                  {isArabic ? 'عرض التفاصيل' : 'View Details'}
                </Link>
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Indicators */}
        {locations.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {locations.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === currentIndex 
                    ? "w-8 bg-primary" 
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
