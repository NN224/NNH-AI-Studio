"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/navigation";
import Image from "next/image";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import {
  Video,
  Activity,
  Sparkles,
  MessageSquare,
  MapPin,
  Play,
  Star,
  BarChart3,
  DollarSign,
  Globe,
  CheckCircle,
  Users,
  Headphones,
  ArrowRight,
  Menu,
  ArrowUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing";
import { TestimonialsSection } from "@/components/landing/testimonials";
import { FAQSection } from "@/components/landing/faq";
import { DashboardPreviewSection } from "@/components/landing/dashboard-preview";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { VideoSection } from "@/components/landing/video-section";
import { ScreenshotsSection } from "@/components/landing/screenshots";
import { LiveChat } from "@/components/landing/live-chat";
import { LiveDemoSection } from "@/components/landing/live-demo-section";
import { PricingComparisonSection } from "@/components/landing/pricing-comparison";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { LandingJsonLd } from "@/components/seo/landing-seo";
import { PublicFooter } from "@/components/layout/public-footer";

export default function LandingPage() {
  const t = useTranslations("landing");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/nnh-logo.png"
                alt="NNH Logo"
                width={40}
                height={40}
                className="object-contain group-hover:scale-110 transition-transform"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                NNH - AI Studio
              </span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                {t("nav.features")}
              </a>
              <a
                href="#how-it-works"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                {t("nav.howItWorks")}
              </a>
              <a
                href="#pricing"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                {t("nav.pricing")}
              </a>
              <Link
                href="/contact"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                {t("nav.contact")}
              </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex border-orange-500 text-orange-500"
              >
                {t("nav.beta")}
              </Badge>
              <Link href="/auth/login" className="hidden sm:block">
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                >
                  {t("nav.signIn")}
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden text-gray-300 hover:text-orange-500 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          {/* Speed Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-full px-6 py-3 mb-8 shadow-lg shadow-orange-500/20"
          >
            <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
            <span className="text-sm text-orange-400 font-bold">
              {t("hero.badge")}
            </span>
          </motion.div>

          {/* Hero Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent leading-tight"
          >
            {t("hero.title")}
          </motion.h1>

          {/* Hero Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-7 text-lg font-bold shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/60 transition-all"
              >
                {t("hero.getStarted")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/en/preview">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white px-10 py-7 text-lg font-bold transition-all"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Try Live Demo
              </Button>
            </Link>
            <a href="#demo">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-10 py-7 text-lg font-bold transition-all"
              >
                <Play className="mr-2 h-5 w-5" />
                {t("hero.watchDemo")}
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
              {t("features.title")}
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-4">
              {t("features.subtitle")}
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1: Instant Auto-Reply */}
            <AIFeatureCard
              icon="⚡"
              title={t("features.instantAutoReply.title")}
              description={t("features.instantAutoReply.description")}
              benefit={t("features.instantAutoReply.benefit")}
              delay={0}
            />

            {/* Feature 2: Smart Question Answers */}
            <AIFeatureCard
              icon="💬"
              title={t("features.smartQuestionAnswers.title")}
              description={t("features.smartQuestionAnswers.description")}
              benefit={t("features.smartQuestionAnswers.benefit")}
              delay={0.1}
            />

            {/* Feature 3: Profile Optimizer */}
            <AIFeatureCard
              icon="🎯"
              title={t("features.profileOptimizer.title")}
              description={t("features.profileOptimizer.description")}
              benefit={t("features.profileOptimizer.benefit")}
              delay={0.2}
            />

            {/* Feature 4: Competitor Intelligence */}
            <AIFeatureCard
              icon="📊"
              title={t("features.competitorIntel.title")}
              description={t("features.competitorIntel.description")}
              benefit={t("features.competitorIntel.benefit")}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-4 border-y border-orange-500/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <TrustIndicator icon={<DollarSign />} text={t("trust.moneyBack")} />
            <TrustIndicator icon={<Globe />} text={t("trust.worldwide")} />
            <TrustIndicator
              icon={<CheckCircle />}
              text={t("trust.noCommitment")}
            />
            <TrustIndicator icon={<Users />} text={t("trust.trusted")} />
            <TrustIndicator icon={<Headphones />} text={t("trust.support")} />
          </div>
        </div>
      </section>

      {/* AI in Action Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-black via-gray-900/50 to-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
              {t("aiInAction.title")}
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-4">
              {t("aiInAction.subtitle")}
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-2 border-red-500/30 rounded-2xl p-8"
            >
              <h4 className="text-2xl font-bold text-red-400 mb-6">
                {t("aiInAction.before.title")}
              </h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-400 font-bold">1</span>
                  </div>
                  <p className="text-gray-300">
                    {t("aiInAction.before.step1")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-400 font-bold">2</span>
                  </div>
                  <p className="text-gray-300">
                    {t("aiInAction.before.step2")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-400 font-bold">3</span>
                  </div>
                  <p className="text-gray-300">
                    {t("aiInAction.before.step3")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-400 font-bold">4</span>
                  </div>
                  <p className="text-gray-300">
                    {t("aiInAction.before.step4")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-red-500/30">
                <p className="text-red-400 font-bold text-lg">
                  {t("aiInAction.before.result")}
                </p>
              </div>
            </motion.div>

            {/* After */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-2 border-green-500/30 rounded-2xl p-8"
            >
              <h4 className="text-2xl font-bold text-green-400 mb-6">
                {t("aiInAction.after.title")}
              </h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-400 font-bold">1</span>
                  </div>
                  <p className="text-gray-300">{t("aiInAction.after.step1")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-gray-300">{t("aiInAction.after.step2")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-400 font-bold">3</span>
                  </div>
                  <p className="text-gray-300">{t("aiInAction.after.step3")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-400 font-bold">4</span>
                  </div>
                  <p className="text-gray-300">{t("aiInAction.after.step4")}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-green-500/30">
                <p className="text-green-400 font-bold text-lg">
                  {t("aiInAction.after.result")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
              {t("stats.title")}
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-16">
              {t("stats.subtitle")}
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StatCard
              number={t("stats.stat1.value")}
              label={t("stats.stat1.label")}
              delay={0}
            />
            <StatCard
              number={t("stats.stat2.value")}
              label={t("stats.stat2.label")}
              delay={0.1}
            />
            <StatCard
              number={t("stats.stat3.value")}
              label={t("stats.stat3.label")}
              delay={0.2}
            />
            <StatCard
              number={t("stats.stat4.value")}
              label={t("stats.stat4.label")}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Live Demo Section */}
      <LiveDemoSection />

      {/* Dashboard Preview Section */}
      <DashboardPreviewSection />

      {/* Video Section */}
      <VideoSection />

      {/* Screenshots Section */}
      <ScreenshotsSection />

      {/* Pricing Comparison Section */}
      <PricingComparisonSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-y border-orange-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("cta.title")}
            </h2>
            <p className="text-xl text-gray-400 mb-10">{t("cta.subtitle")}</p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-6 text-lg"
              >
                {t("cta.button")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/50 z-50 transition-colors"
        >
          <ArrowUp className="w-6 h-6 text-white" />
        </motion.button>
      )}

      {/* Live Chat */}
      <LiveChat />

      {/* Google Analytics */}
      <GoogleAnalytics />

      {/* SEO JSON-LD */}
      <LandingJsonLd />
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/30 rounded-2xl p-6 hover:border-orange-500 transition-all duration-300 cursor-pointer group"
    >
      <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </motion.div>
  );
}

// Trust Indicator Component
function TrustIndicator({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center space-y-2"
    >
      <div className="text-orange-500">{icon}</div>
      <p className="text-sm text-gray-400 text-center">{text}</p>
    </motion.div>
  );
}

// Stat Card Component
function StatCard({
  number,
  label,
  delay,
}: {
  number: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/30 rounded-2xl p-8 hover:border-orange-500 transition-all duration-300"
    >
      <div className="text-4xl md:text-5xl font-bold text-orange-500 mb-2">
        {number}
      </div>
      <div className="text-gray-400">{label}</div>
    </motion.div>
  );
}

// AI Feature Card Component
function AIFeatureCard({
  icon,
  title,
  description,
  benefit,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  benefit: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-gradient-to-br from-gray-900 via-gray-900/80 to-black border-2 border-orange-500/30 rounded-2xl p-8 hover:border-orange-500 transition-all duration-300 cursor-pointer group"
    >
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-orange-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 mb-4 leading-relaxed">{description}</p>
      <div className="mt-4 pt-4 border-t border-orange-500/20">
        <p className="text-orange-500 font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {benefit}
        </p>
      </div>
    </motion.div>
  );
}
