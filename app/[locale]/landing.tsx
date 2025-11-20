"use client";

import { t } from "@/lib/i18n/stub";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import {
  ArrowRight,
  BarChart3,
  MapPin,
  MessageSquare,
  Sparkles,
  Check,
  Play,
  Activity,
  Video,
  Star,
  Shield,
  Globe,
  Users,
  TrendingUp,
  Award,
  Headphones,
  Building2,
  Briefcase,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: t("faq.questions.q1.question"),
      answer: t("faq.questions.q1.answer"),
    },
    {
      question: t("faq.questions.q2.question"),
      answer: t("faq.questions.q2.answer"),
    },
    {
      question: t("faq.questions.q3.question"),
      answer: t("faq.questions.q3.answer"),
    },
    {
      question: t("faq.questions.q4.question"),
      answer: t("faq.questions.q4.answer"),
    },
    {
      question: t("faq.questions.q5.question"),
      answer: t("faq.questions.q5.answer"),
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white pt-8">
      <header className="fixed top-8 left-0 right-0 z-40 border-b border-primary/20 bg-black/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/nnh-logo.png"
                alt="NNH AI Studio Logo"
                className="w-10 h-10 rounded-lg object-contain"
              />
              <span className="text-xl font-bold">NNH AI Studio</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="#features"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("nav.features")}
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("nav.howItWorks")}
              </a>
              <a
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("nav.pricing")}
              </a>
              <Link
                href="/pricing/contact"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("nav.contact")}
              </Link>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-primary/30 text-foreground hover:bg-primary/10 bg-transparent"
              >
                <Link href="/auth/login">{t("nav.signIn")}</Link>
              </Button>
            </nav>
            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-primary/30 text-foreground hover:bg-primary/10 bg-transparent"
              >
                <Link href="/auth/login">{t("nav.signIn")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />

        <div className="relative container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <span className="text-sm font-medium text-primary">
                {t("rating")}
              </span>
              <span className="text-sm text-muted-foreground">
                • {t("trustedBy")}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              {t("hero.title")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-lg px-8"
              >
                <Link href="/auth/signup">
                  {t("hero.getStarted")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 text-lg px-8 bg-transparent"
              >
                <Link href="/auth/login">{t("hero.signIn")}</Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div
            id="features"
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24"
          >
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.multiLocation.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.multiLocation.description")}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Play className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.youtubeManagement.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.youtubeManagement.description")}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.aiReviews.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.aiReviews.description")}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.analytics.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.analytics.description")}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.videoAnalytics.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.videoAnalytics.description")}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.monitoring.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.monitoring.description")}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.aiStudio.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.aiStudio.description")}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {t("features.commentManagement.title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("features.commentManagement.description")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators Section */}
      <section className="py-12 bg-card/30 border-y border-primary/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("trustIndicators.moneyBack")}
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Globe className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("trustIndicators.worldwide")}
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Check className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("trustIndicators.noCommitment")}
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("trustIndicators.trusted")}
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Headphones className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("trustIndicators.support")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Results Section */}
      <section className="py-24 bg-gradient-to-b from-card/50 to-transparent">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">
              {t("stats.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("stats.subtitle")}
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">
                {t("stats.storefrontVisits.value")}
              </div>
              <p className="text-muted-foreground">
                {t("stats.storefrontVisits.label")}
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">
                {t("stats.impressions.value")}
              </div>
              <p className="text-muted-foreground">
                {t("stats.impressions.label")}
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">
                {t("stats.phoneCalls.value")}
              </div>
              <p className="text-muted-foreground">
                {t("stats.phoneCalls.label")}
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <Star className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">
                {t("stats.reviews.value")}
              </div>
              <p className="text-muted-foreground">
                {t("stats.reviews.label")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="py-24 bg-gradient-to-b from-transparent to-card/50"
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("howItWorks.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="relative">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="text-2xl font-semibold">
                  {t("howItWorks.step1.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("howItWorks.step1.description")}
                </p>
              </div>
              <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
            </div>

            <div className="relative">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h3 className="text-2xl font-semibold">
                  {t("howItWorks.step2.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("howItWorks.step2.description")}
                </p>
              </div>
              <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-semibold">
                {t("howItWorks.step3.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("howItWorks.step3.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies/Testimonials Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">
              {t("testimonials.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("testimonials.heading")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("testimonials.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-card to-secondary border border-primary/30">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6">
                {t("testimonials.testimonial1.quote")}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    {t("testimonials.testimonial1.name")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("testimonials.testimonial1.role")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-primary/20 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-primary">900%</div>
                  <p className="text-sm text-muted-foreground">
                    Impressions Growth
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">600%</div>
                  <p className="text-sm text-muted-foreground">
                    Website Clicks
                  </p>
                </div>
              </div>
            </div>
            {/* Testimonial 2 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-card to-secondary border border-primary/30">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6">
                {t("testimonials.testimonial2.quote")}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    {t("testimonials.testimonial2.name")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("testimonials.testimonial2.role")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-primary/20 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-primary">250%</div>
                  <p className="text-sm text-muted-foreground">
                    {t("testimonials.testimonial2.stat1Label")}
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">240%</div>
                  <p className="text-sm text-muted-foreground">
                    {t("testimonials.testimonial2.stat2Label")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("dashboard.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("dashboard.subtitle")}
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="relative rounded-2xl border border-primary/30 overflow-hidden bg-gradient-to-br from-card to-secondary p-8">
              <div className="aspect-video rounded-xl border border-primary/20 bg-black/50 flex items-center justify-center relative overflow-hidden">
                <img
                  src="/modern-dark-dashboard-interface-with-charts-and-an.jpg"
                  alt="Dashboard Preview"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 rounded-full bg-primary/30">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-accent" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {t("dashboard.realTimeAnalytics")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Tools Section */}
      <section className="py-24 bg-gradient-to-b from-card/30 to-transparent">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">
              {t("freeTools.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("freeTools.heading")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("freeTools.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <Sparkles className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                AI Review Reply Generator
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Use AI to generate customizable & engaging Customer Review
                Replies for Free.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Explore Now</Link>
              </Button>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <Award className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Profile Strength Calculator
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Get a profile strength of your Google My Business Profile to
                find the missing gaps in the local SEO for free.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Calculate Now</Link>
              </Button>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <BarChart3 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Free GMB Profile Audit
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Audit your Local Business Profile for free and find scope for
                improvement in the Local SEO and Content Updates.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Audit Now</Link>
              </Button>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Category Generator</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Get Additional Category suggestions based on the Primary
                Category of your Profile.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Generate Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("pricing.heading")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("pricing.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Up to 3 locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Basic analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Review monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Email support</span>
                </li>
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full border-primary/30 hover:bg-primary/10 bg-transparent"
              >
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Up to 25 locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">AI-powered responses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Custom reports</span>
                </li>
              </ul>
              <Button
                asChild
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
              >
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>

            {/* Agency Plan */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Agency</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$149</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">White-label solution</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Team collaboration</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">API access</span>
                </li>
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full border-primary/30 hover:bg-primary/10 bg-transparent"
              >
                <Link href="/pricing/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions for Different Users */}
      <section className="py-24 bg-gradient-to-b from-transparent to-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">
              {t("solutions.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("solutions.heading")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("solutions.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Solo Storefronts */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <Building2 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Solo Storefronts</h3>
              <ul className="space-y-3 mb-6 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Manage Business Profiles & get Complete Audit</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Check Reviews, Sentiment Analysis & set AI Replies
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Track Rank on Local Keywords & Check Geo Grid Rank
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Analyze Local Competitors & check their best practices
                  </span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signup">Explore Now →</Link>
              </Button>
            </div>
            {/* Agencies */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold">
                Most Popular
              </div>
              <Briefcase className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Agencies</h3>
              <ul className="space-y-3 mb-6 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Connect & manage Multiple Locations on a single dashboard
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>White-label dashboard as per your needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Get Advanced Data Analytics & Custom Reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Manage Locations at scale & publish content with help of AI
                  </span>
                </li>
              </ul>
              <Button
                asChild
                className="w-full bg-gradient-to-r from-primary to-accent"
              >
                <Link href="/auth/signup">Explore Now →</Link>
              </Button>
            </div>
            {/* Multi-Location Brands */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-4">
                Multi-Location Brands
              </h3>
              <ul className="space-y-3 mb-6 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Assistance for Google Business Profile Bulk Verification
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Invite Team Members based on roles & share access within the
                    team
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Leverage content library to save evergreen and reusable
                    content
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Get 24 X 7 Support & Custom Pricing Plans</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/pricing/contact">Contact Sales →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-24 bg-gradient-to-b from-card/50 to-transparent">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">
              {t("integrations.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("integrations.heading")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("integrations.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-8 max-w-6xl mx-auto items-center justify-items-center">
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Google</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">YouTube</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Bing</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Apple</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">ChatGPT</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Instagram</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Facebook</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">+ More</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="py-24 bg-gradient-to-b from-transparent to-card/50"
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">
              {t("faq.title")}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("faq.heading")}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-primary/30 rounded-xl bg-card overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
                >
                  <span className="text-left font-semibold">
                    {faq.question}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-primary/20 via-transparent to-accent/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold">{t("cta.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("cta.subtitle")}{" "}
              <span className="text-primary font-semibold">
                {t("cta.trial")}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-lg px-8"
              >
                <Link href="/auth/signup">
                  {t("cta.startTrial")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 text-lg px-8 bg-transparent"
              >
                <Link href="/pricing/contact">{t("cta.scheduleDemo")}</Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 pt-8 max-w-2xl mx-auto">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-primary/20">
                <Headphones className="w-8 h-8 text-primary" />
                <p className="font-semibold">{t("cta.coach")}</p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-primary/20">
                <Sparkles className="w-8 h-8 text-primary" />
                <p className="font-semibold">{t("cta.features")}</p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-primary/20">
                <Clock className="w-8 h-8 text-primary" />
                <p className="font-semibold">{t("cta.support")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-primary/20 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <img
                  src="/nnh-logo.png"
                  alt="NNH AI Studio Logo"
                  className="w-10 h-10 rounded-lg object-contain"
                />
                <span className="text-xl font-bold">NNH AI Studio</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                The ultimate AI-powered platform for managing Google My Business
                locations and YouTube channels. Automate reviews, create
                content, and grow your online presence.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="hover:text-primary transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <a
                    href="#features"
                    className="hover:text-primary transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-primary transition-colors"
                  >
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/pricing/contact"
                    className="hover:text-primary transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="hover:text-primary transition-colors"
                  >
                    FAQs
                  </a>
                </li>
                <li>
                  <Link
                    href="/pricing/contact"
                    className="hover:text-primary transition-colors"
                  >
                    Book a Demo
                  </Link>
                </li>
                <li>
                  <a
                    href="/auth/signup"
                    className="hover:text-primary transition-colors"
                  >
                    Free Trial
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {new Date().getFullYear()} NNH AI Studio. All rights
              reserved.
            </p>
            <p className="text-xs text-muted-foreground text-center md:text-right">
              NNH AI Studio's use and transfer to any other app of information
              received from Google APIs will adhere to Google API Services User
              Data Policy, including the Limited Use requirements.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
