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
          {/* Rating Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-6 py-2 mb-8"
          >
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 fill-orange-500 text-orange-500"
                />
              ))}
            </div>
            <span className="text-sm text-orange-500 font-medium">
              {t("hero.rating")}
            </span>
            <span className="text-sm text-gray-400">
              • {t("hero.trustedBy")}
            </span>
          </motion.div>

          {/* Hero Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent"
          >
            {t("hero.title")}
          </motion.h1>

          {/* Hero Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center space-x-4"
          >
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
              >
                {t("hero.getStarted")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10 px-8 py-6 text-lg"
              >
                {t("hero.signIn")}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Video Analytics */}
            <FeatureCard
              icon={<Video className="w-6 h-6" />}
              title={t("features.videoAnalytics.title")}
              description={t("features.videoAnalytics.description")}
              delay={0}
            />

            {/* Feature 2: Monitoring */}
            <FeatureCard
              icon={<Activity className="w-6 h-6" />}
              title={t("features.monitoring.title")}
              description={t("features.monitoring.description")}
              delay={0.1}
            />

            {/* Feature 3: AI Studio */}
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title={t("features.aiStudio.title")}
              description={t("features.aiStudio.description")}
              delay={0.2}
            />

            {/* Feature 4: Comment Management */}
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title={t("features.commentManagement.title")}
              description={t("features.commentManagement.description")}
              delay={0.3}
            />

            {/* Feature 5: Multi Location */}
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title={t("features.multiLocation.title")}
              description={t("features.multiLocation.description")}
              delay={0.4}
            />

            {/* Feature 6: YouTube Management */}
            <FeatureCard
              icon={<Play className="w-6 h-6" />}
              title={t("features.youtubeManagement.title")}
              description={t("features.youtubeManagement.description")}
              delay={0.5}
            />

            {/* Feature 7: AI Reviews */}
            <FeatureCard
              icon={<Star className="w-6 h-6" />}
              title={t("features.aiReviews.title")}
              description={t("features.aiReviews.description")}
              delay={0.6}
            />

            {/* Feature 8: Analytics */}
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title={t("features.analytics.title")}
              description={t("features.analytics.description")}
              delay={0.7}
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
              number="10,000+"
              label={t("stats.activeUsers")}
              delay={0}
            />
            <StatCard
              number="1M+"
              label={t("stats.reviewsManaged")}
              delay={0.1}
            />
            <StatCard number="50+" label={t("stats.countries")} delay={0.2} />
            <StatCard number="99.9%" label={t("stats.uptime")} delay={0.3} />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Dashboard Preview Section */}
      <DashboardPreviewSection />

      {/* Video Section */}
      <VideoSection />

      {/* Screenshots Section */}
      <ScreenshotsSection />

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
