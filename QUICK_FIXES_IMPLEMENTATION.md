# 🚀 Quick Fixes - Implementation Guide

## إصلاحات سريعة يمكن تنفيذها في أقل من ساعة

---

## Fix 1: Auth Middleware (15 دقيقة)

### ملف: `middleware.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Handle i18n first
  const handleI18nRouting = createIntlMiddleware({
    locales,
    defaultLocale: 'en',
  });

  const i18nResponse = handleI18nRouting(request);
  
  // 2. Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 3. Check auth for protected routes
  const pathname = request.nextUrl.pathname;
  const locale = pathname.split('/')[1] || 'en';
  
  const protectedPaths = [
    '/dashboard',
    '/reviews',
    '/questions',
    '/posts',
    '/settings',
    '/metrics',
    '/media',
    '/locations',
    '/youtube-dashboard',
  ];

  const isProtectedRoute = protectedPaths.some(path => 
    pathname.includes(path)
  );

  if (isProtectedRoute) {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Redirect authenticated users away from auth pages
  const authPaths = ['/auth/login', '/auth/signup'];
  const isAuthRoute = authPaths.some(path => pathname.includes(path));

  if (isAuthRoute) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  return i18nResponse || response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Fix 2: Dashboard Layout Auth Check (10 دقائق)

### ملف: `app/[locale]/(dashboard)/layout.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CommandPalette } from '@/components/layout/command-palette';
import { KeyboardProvider } from '@/components/keyboard/keyboard-provider';
import { BrandProfileProvider } from '@/contexts/BrandProfileContext';
import { DynamicThemeProvider } from '@/components/theme/DynamicThemeProvider';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface UserProfile {
  name: string | null;
  avatarUrl: string | null;
}

// Loading Screen Component
function DashboardLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ 
    name: 'User', 
    avatarUrl: null 
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        router.push('/auth/login');
        return;
      }

      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        const locale = pathname.split('/')[1] || 'en';
        router.push(`/${locale}/auth/login?redirectedFrom=${pathname}`);
        return;
      }

      // Set user profile
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const avatarUrl = user.user_metadata?.avatar_url || null;

      setUserProfile({ name, avatarUrl });
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router, pathname, supabase]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading screen while checking auth
  if (isAuthenticated === null) {
    return <DashboardLoadingScreen />;
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <BrandProfileProvider>
      <DynamicThemeProvider>
        <KeyboardProvider onCommandPaletteOpen={() => setCommandPaletteOpen(true)}>
          <div className="relative min-h-screen bg-background">
            <Sidebar 
              isOpen={sidebarOpen} 
              onClose={() => setSidebarOpen(false)} 
              userProfile={userProfile}
            />

            <div className="lg:pl-[280px] pt-8">
              <Header
                onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
                userProfile={userProfile}
              />

              <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-6 lg:py-8 pb-20 lg:pb-8">
                <div className="mx-auto max-w-7xl">
                  {children}
                </div>
              </main>
            </div>

            <MobileNav />

            <CommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
            />
          </div>
        </KeyboardProvider>
      </DynamicThemeProvider>
    </BrandProfileProvider>
  );
}
```

---

## Fix 3: Navigation Utils (5 دقائق)

### ملف: `lib/utils/navigation.ts` (جديد)

```typescript
/**
 * Navigation utilities for consistent routing
 */

export function getAuthUrl(
  locale: string, 
  page: 'login' | 'signup' | 'forgot-password' | 'reset-password'
): string {
  return `/${locale}/auth/${page}`;
}

export function getDashboardUrl(locale: string, path?: string): string {
  const basePath = `/${locale}/dashboard`;
  return path ? `${basePath}/${path}` : basePath;
}

export function getSettingsUrl(locale: string, tab?: string): string {
  const basePath = `/${locale}/settings`;
  return tab ? `${basePath}/${tab}` : basePath;
}

export function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0];
  return ['en', 'ar'].includes(locale) ? locale : 'en';
}

export function addRedirectParam(url: string, from: string): string {
  const urlObj = new URL(url, 'http://localhost');
  urlObj.searchParams.set('redirectedFrom', from);
  return urlObj.pathname + urlObj.search;
}
```

### استخدام:
```typescript
// قبل:
redirect('/login'); // ❌
router.push('/en/auth/login'); // ❌

// بعد:
import { getAuthUrl, getLocaleFromPathname } from '@/lib/utils/navigation';

const locale = getLocaleFromPathname(pathname);
redirect(getAuthUrl(locale, 'login')); // ✅
```

---

## Fix 4: Empty State Component (10 دقائق)

### ملف: `components/dashboard/empty-state.tsx` (جديد)

```typescript
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-[400px]"
    >
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="mb-4 flex justify-center">
            {icon || (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6">{description}</p>
          
          <div className="space-y-2">
            {action}
            {secondaryAction}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Preset: GMB Connection
export function GMBConnectionEmptyState() {
  return (
    <EmptyState
      title="Connect Your Google Business Profile"
      description="Get started by connecting your Google Business Profile to manage reviews, questions, and posts all in one place."
      icon={
        <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <Link2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      }
      action={
        <Button size="lg" className="w-full">
          <Link2 className="mr-2 h-4 w-4" />
          Connect Google Business Profile
        </Button>
      }
      secondaryAction={
        <Button variant="ghost" size="sm" className="w-full">
          Learn more about GMB integration
        </Button>
      }
    />
  );
}
```

### استخدام في Dashboard:
```typescript
// app/[locale]/(dashboard)/dashboard/page.tsx
import { GMBConnectionEmptyState } from '@/components/dashboard/empty-state';

export default function DashboardPage() {
  const { connected } = useGmbStatus();
  
  if (!connected) {
    return <GMBConnectionEmptyState />;
  }
  
  return (/* normal dashboard */);
}
```

---

## Fix 5: Resend Email Button (5 دقائق)

### تعديل: `app/[locale]/(auth)/signup/page.tsx`

```typescript
// في success state:
if (success) {
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const handleResendEmail = async () => {
    try {
      await authService.resendVerificationEmail(email);
      toast.success('Verification email sent!');
      setResendCooldown(60); // 60 seconds cooldown
      
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error('Failed to resend email. Please try again.');
    }
  };
  
  return (
    <motion.div /* ... */>
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
        <p className="text-muted-foreground mb-2">
          We sent a verification link to:
        </p>
        <p className="font-semibold mb-4">{email}</p>
        <p className="text-sm text-muted-foreground mb-6">
          The link will expire in 24 hours.
        </p>
        
        <div className="w-full space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : 'Resend verification email'
            }
          </Button>
          
          <Link href="/auth/login" className="block">
            <Button variant="ghost" className="w-full">
              Already verified? Sign in
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## Fix 6: Redirect After Login (2 دقيقة)

### تعديل: `app/[locale]/(auth)/login/page.tsx`

```typescript
const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    setIsLoading(true);
    setError(null);

    await authService.signIn(email, password, false);

    toast.success('Welcome back!');
    
    // استخدم redirectTo من URL params أو dashboard
    const finalRedirect = redirectTo || getDashboardUrl(locale);
    router.push(finalRedirect);
    router.refresh();
  } catch (err) {
    // ... error handling
  }
};
```

---

## 🎯 Testing Checklist

بعد تطبيق الإصلاحات، اختبر:

### Auth Flow:
- [ ] غير مسجل يحاول الوصول لـ `/dashboard` → يُحوّل لـ login
- [ ] مسجل يحاول الوصول لـ `/auth/login` → يُحوّل لـ dashboard
- [ ] Redirect after login يعمل بشكل صحيح
- [ ] Locale يُحفظ في جميع redirects

### Dashboard:
- [ ] Loading screen يظهر أثناء auth check
- [ ] Empty state يظهر عند عدم وجود GMB connection
- [ ] User profile يُعرض بشكل صحيح

### Email Verification:
- [ ] Resend button يعمل
- [ ] Cooldown يعمل بشكل صحيح
- [ ] Link to login يعمل

---

## ⏱️ الوقت المتوقع للتنفيذ

- Fix 1 (Middleware): **15 دقيقة**
- Fix 2 (Layout): **10 دقائق**
- Fix 3 (Navigation): **5 دقائق**
- Fix 4 (Empty State): **10 دقائق**
- Fix 5 (Resend Email): **5 دقائق**
- Fix 6 (Redirect): **2 دقيقة**

**المجموع: ~47 دقيقة**

---

## 🚀 Next Steps

بعد تطبيق هذه الإصلاحات:
1. اختبر User Journey كامل
2. راقب Analytics
3. اجمع User Feedback
4. ابدأ في Onboarding Wizard

**هذه الإصلاحات ستحسن User Experience بشكل كبير! 🎉**
