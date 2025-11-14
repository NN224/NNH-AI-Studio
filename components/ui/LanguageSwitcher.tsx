"use client";

import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname } from '@/lib/navigation';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, setIsPending] = useState(false);

  const switchLocale = (newLocale: string) => {
    if (isPending || newLocale === locale) return;
    
    setIsPending(true);
    
    try {
      // Get current pathname (without locale prefix from next-intl)
      const currentPath = pathname || '/';
      
      // Get current search params
      const searchParams = typeof window !== 'undefined' ? window.location.search : '';
      
      // Build new path with new locale
      // For default locale (en), don't add prefix if localePrefix is 'as-needed'
      let newPath: string;
      if (newLocale === 'en') {
        // Default locale - no prefix needed
        newPath = currentPath === '/' ? '/' : currentPath;
      } else {
        // Non-default locale - add prefix
        newPath = `/${newLocale}${currentPath === '/' ? '' : currentPath}`;
      }
      
      // Add search params if they exist
      const fullPath = newPath + searchParams;
      
      // Use window.location.href for full page reload to ensure locale change
      if (typeof window !== 'undefined') {
        window.location.href = fullPath;
      }
    } catch (error) {
      console.error('Error switching locale:', error);
      setIsPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="flex items-center gap-2 bg-black/40 border-primary/20 backdrop-blur-sm hover:bg-black/60 disabled:opacity-50"
        >
          <Globe className={`w-4 h-4 text-primary ${isPending ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {locale === 'ar' ? 'العربية' : 'English'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => switchLocale('en')}
          className={locale === 'en' ? 'bg-primary/10' : ''}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>English</span>
            {locale === 'en' && <span className="ml-auto text-xs">✓</span>}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLocale('ar')}
          className={locale === 'ar' ? 'bg-primary/10' : ''}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>العربية</span>
            {locale === 'ar' && <span className="ml-auto text-xs">✓</span>}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
