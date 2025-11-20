import type React from "react"
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from "sonner"
import { Providers } from '../providers';
import { BetaIndicator } from '@/components/common/beta-badge';

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'ar') {
    notFound();
  }
  const messages = await getMessages({ locale });
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <Providers>
          <BetaIndicator />
          {children}
          <Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} richColors closeButton />
        </Providers>
      </NextIntlClientProvider>
    </div>
  )
}
