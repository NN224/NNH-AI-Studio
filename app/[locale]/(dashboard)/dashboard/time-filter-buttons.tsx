'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { toast } from 'sonner';

function TimeFilterButtonsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('filter') || '30d';

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'reset') {
      params.delete('filter');
      toast.info('Filter reset — showing all data');
    } else {
      params.set('filter', filter);
      toast.success(`Filter applied: ${filter.toUpperCase()}`);
    }
    router.push(`?${params.toString()}`);
    router.refresh();
    window.dispatchEvent(new Event('dashboard:refresh'));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        className={currentFilter === '7d' ? "bg-orange-600 text-white border-orange-600" : "border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10"}
        onClick={() => handleFilterChange('7d')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Last 7 Days
      </Button>
      <Button 
        size="sm"
        className={currentFilter === '30d' ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10"}
        onClick={() => handleFilterChange('30d')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Last 30 Days
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        className={currentFilter === '90d' ? "bg-orange-600 text-white border-orange-600" : "border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10"}
        onClick={() => handleFilterChange('90d')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Last 90 Days
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        className={currentFilter === 'custom' ? "bg-orange-600 text-white border-orange-600" : "border-orange-500/20 text-zinc-300 hover:border-orange-500/50 hover:bg-orange-500/10"}
        onClick={() => handleFilterChange('custom')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Custom
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        onClick={() => handleFilterChange('reset')}
      >
        Reset
      </Button>
    </div>
  );
}

export function TimeFilterButtons() {
  return (
    <Suspense fallback={
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse"></div>
        <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse"></div>
        <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse"></div>
      </div>
    }>
      <TimeFilterButtonsContent />
    </Suspense>
  );
}
