"use client";

import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    // usePathname from next-intl returns pathname without locale prefix
    // So we can directly use it to build the new path
    const currentPath = pathname || '/';
    
    // Build new path with new locale
    // For default locale (en), don't add prefix if localePrefix is 'as-needed'
    let newPath: string;
    if (newLocale === 'en') {
      // Default locale - no prefix needed
      newPath = currentPath;
    } else {
      // Non-default locale - add prefix
      newPath = `/${newLocale}${currentPath === '/' ? '' : currentPath}`;
    }
    
    // Use startTransition for better UX
    startTransition(() => {
      router.replace(newPath);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-black/40 border-primary/20 backdrop-blur-sm hover:bg-black/60"
        >
          <Globe className="w-4 h-4 text-primary" />
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
