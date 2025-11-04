import createMiddleware from 'next-intl/middleware';
import { updateSession } from "@/lib/supabase/middleware"
import { locales } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
});

export async function middleware(request: any) {
  const response = intlMiddleware(request);
  // @ts-ignore - Type conflict between next-intl and supabase middleware
  return await updateSession(request, response);
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/(en|ar)/:path*'
  ],
}
