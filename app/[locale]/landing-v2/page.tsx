/**
 * Landing Page V2
 * Production-ready landing page with interactive hero
 */

import type { Metadata } from 'next'
import InteractiveHero from './components/InteractiveHero'
import LiveDemoSandbox from './components/LiveDemoSandbox'
import ROICalculator from './components/ROICalculator'
import AIChatWidget from './components/AIChatWidget'
import SocialProofStream from './components/SocialProofStream'

export const metadata: Metadata = {
  title: 'NNH AI Studio - أفضل منصة لإدارة Google My Business',
  description: 'منصة ذكية مدعومة بالذكاء الاصطناعي لإدارة حساباتك على Google My Business. أتمتة الردود، تحليلات متقدمة، وإدارة متعددة المواقع.',
  keywords: 'Google My Business, GMB, إدارة الأعمال, الذكاء الاصطناعي, التقييمات, التحليلات, NNH',
  openGraph: {
    title: 'NNH AI Studio - أفضل منصة لإدارة Google My Business',
    description: 'منصة ذكية مدعومة بالذكاء الاصطناعي لإدارة حساباتك على Google My Business',
    type: 'website',
    images: ['/nnh-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NNH AI Studio - أفضل منصة لإدارة Google My Business',
    description: 'منصة ذكية مدعومة بالذكاء الاصطناعي لإدارة حساباتك على Google My Business',
    images: ['/nnh-logo.png'],
  },
}

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-background">
      {/* Premium Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-accent/20 to-primary/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-4000" />
        
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,53,0.05),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative space-y-20">
        <InteractiveHero />
        <LiveDemoSandbox />
        <ROICalculator />
      </div>

      {/* Floating Widgets */}
      <AIChatWidget />
      <SocialProofStream />
    </div>
  )
}

