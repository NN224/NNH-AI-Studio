import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Error alert component for locations page
export const LocationsErrorAlert = ({ 
  error, 
  onRetryAction 
}: { 
  error: string; 
  onRetryAction: () => void; 
}) => {
  const t = useTranslations('Locations');

  return (
    <Card className="border-destructive">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">{t('errors.loadFailed')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRetryAction}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('actions.retry')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};