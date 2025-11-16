import type React from "react"
import type { Metadata } from "next"
import { Providers } from "./providers"
import { Toaster } from "sonner"
import "./globals.css"
import { BrandProfileProvider } from "@/contexts/BrandProfileContext"
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'https://nnh-ai-studio.com'
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: "NNH AI Studio - Google My Business & YouTube Management Platform",
  description: "Manage your Google My Business locations, YouTube channel, reviews, and content with AI-powered tools",
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
    shortcut: '/favicon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html className="dark" lang="en" dir="ltr">
      <body className="min-h-screen bg-background font-sans antialiased">
        <BrandProfileProvider>
          <Providers>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </Providers>
        </BrandProfileProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
