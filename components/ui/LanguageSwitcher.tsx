"use client";

import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    if (isPending || newLocale === locale) return;
    
    try {
      // usePathname from next-intl already returns pathname without locale prefix
      const pathWithoutLocale = pathname || '/';
      
      // Get current search params
      const searchParams = typeof window !== 'undefined' ? window.location.search : '';
      
      // Build new path with new locale
      // For default locale (en), don't add prefix if localePrefix is 'as-needed'
      let newPath: string;
      if (newLocale === 'en') {
        // Default locale - no prefix needed
        newPath = pathWithoutLocale === '/' ? '/' : pathWithoutLocale;
      } else {
        // Non-default locale - add prefix
        newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
      }
      
      // Add search params if they exist
      const fullPath = newPath + searchParams;
      
      // Debug logging
      if (typeof window !== 'undefined') {
        console.log('[LanguageSwitcher] Switching locale:', {
          from: locale,
          to: newLocale,
          pathname,
          pathWithoutLocale,
          newPath,
          fullPath,
          windowPathname: window.location.pathname,
        });
      }
      
      // Use startTransition for better UX and then navigate
      startTransition(() => {
        // Use window.location.href for full page reload to ensure locale change
        // This is necessary because next-intl needs a full reload to change locale
        if (typeof window !== 'undefined') {
          window.location.href = fullPath;
        }
      });
    } catch (error) {
      console.error('[LanguageSwitcher] Error switching locale:', error);
    }
  };

  const isEnglish = locale === 'en';
  const isArabic = locale === 'ar';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isEnglish ? "default" : "outline"}
        size="sm"
        disabled={isPending || isEnglish}
        onClick={() => switchLocale('en')}
        className={cn(
          "flex items-center gap-2 transition-all",
          isEnglish 
            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
            : "bg-black/40 border-primary/20 backdrop-blur-sm hover:bg-black/60 disabled:opacity-50"
        )}
      >
        <Globe className={cn("w-4 h-4", isEnglish ? "text-primary-foreground" : "text-primary", isPending && !isEnglish && "animate-spin")} />
        <span className="text-sm font-medium">English</span>
        {isEnglish && <span className="text-xs">✓</span>}
      </Button>
      
      <Button
        variant={isArabic ? "default" : "outline"}
        size="sm"
        disabled={isPending || isArabic}
        onClick={() => switchLocale('ar')}
        className={cn(
          "flex items-center gap-2 transition-all",
          isArabic 
            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
            : "bg-black/40 border-primary/20 backdrop-blur-sm hover:bg-black/60 disabled:opacity-50"
        )}
      >
        <Globe className={cn("w-4 h-4", isArabic ? "text-primary-foreground" : "text-primary", isPending && !isArabic && "animate-spin")} />
        <span className="text-sm font-medium">العربية</span>
        {isArabic && <span className="text-xs">✓</span>}
      </Button>
    </div>
  );
}
