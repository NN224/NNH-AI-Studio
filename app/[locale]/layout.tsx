import type React from "react"
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from "sonner"
import { Providers } from '../providers';

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params;
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} lang={locale}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </NextIntlClientProvider>
    </div>
  )
}
