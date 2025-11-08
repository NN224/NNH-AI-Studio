'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface LocationDetailsButtonProps {
  locationId?: string;
}

export function LocationDetailsButton({ locationId }: LocationDetailsButtonProps) {
  const router = useRouter();

  const handleViewDetails = () => {
    try {
      if (locationId) {
        router.push(`/locations/${locationId}`);
        toast.success('Navigated to location details successfully!');
      } else {
        router.push('/locations');
        toast.success('Navigated to Locations successfully!');
      }
      window.dispatchEvent(new Event('dashboard:refresh'));
    } catch (error) {
      console.error('[LocationDetailsButton] Navigation error:', error);
      toast.error('Failed to navigate to the location. Please try again.');
    }
  };

  return (
    <Button 
      size="sm" 
      variant="ghost"
      className="w-full text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors duration-200"
      onClick={handleViewDetails}
    >
      {locationId ? 'View Details →' : 'Go to Location →'}
    </Button>
  );
}
