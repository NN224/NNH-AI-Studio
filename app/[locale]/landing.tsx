"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold">NNH AI Studio</span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                Pricing
              </a>
              <a
                href="#contact"
                className="text-gray-300 hover:text-orange-500 transition-colors"
              >
                Contact
              </a>
            </div>

            {/* CTA */}
            <div className="flex items-center space-x-4">
              <Badge
                variant="outline"
                className="border-orange-500 text-orange-500"
              >
                BETA - New features weekly
              </Badge>
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

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
            <span className="text-sm text-orange-500 font-medium">rating</span>
            <span className="text-sm text-gray-400">• trustedBy</span>
          </motion.div>

          {/* Hero Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent"
          >
            Manage Your Business
            <br />
            with AI Power
          </motion.h1>

          {/* Hero Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            Automate reviews, manage multiple locations, and grow your business
            with AI-powered insights
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
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10 px-8 py-6 text-lg"
              >
                Sign In
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
              title="Video Analytics"
              description="Track and analyze your video performance across platforms"
              delay={0}
            />

            {/* Feature 2: Monitoring */}
            <FeatureCard
              icon={<Activity className="w-6 h-6" />}
              title="Real-time Monitoring"
              description="Monitor your business metrics in real-time with AI insights"
              delay={0.1}
            />

            {/* Feature 3: AI Studio */}
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI Studio"
              description="Generate content and responses with advanced AI technology"
              delay={0.2}
            />

            {/* Feature 4: Comment Management */}
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Comment Management"
              description="Manage and respond to comments automatically with AI"
              delay={0.3}
            />

            {/* Feature 5: Multi Location */}
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title="Multi Location"
              description="Manage multiple business locations from one dashboard"
              delay={0.4}
            />

            {/* Feature 6: YouTube Management */}
            <FeatureCard
              icon={<Play className="w-6 h-6" />}
              title="YouTube Management"
              description="Optimize your YouTube channel with AI-powered tools"
              delay={0.5}
            />

            {/* Feature 7: AI Reviews */}
            <FeatureCard
              icon={<Star className="w-6 h-6" />}
              title="AI Reviews"
              description="Automatically respond to reviews with personalized AI replies"
              delay={0.6}
            />

            {/* Feature 8: Analytics */}
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Advanced Analytics"
              description="Get detailed insights and reports on your business performance"
              delay={0.7}
            />
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-4 border-y border-orange-500/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <TrustIndicator icon={<DollarSign />} text="Money Back Guarantee" />
            <TrustIndicator icon={<Globe />} text="Worldwide Coverage" />
            <TrustIndicator icon={<CheckCircle />} text="No Commitment" />
            <TrustIndicator icon={<Users />} text="Trusted by 10,000+" />
            <TrustIndicator icon={<Headphones />} text="24/7 Support" />
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
              Our Impact
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-16">
              Trusted by Businesses Worldwide
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StatCard number="10,000+" label="Active Users" delay={0} />
            <StatCard number="1M+" label="Reviews Managed" delay={0.1} />
            <StatCard number="50+" label="Countries" delay={0.2} />
            <StatCard number="99.9%" label="Uptime" delay={0.3} />
          </div>
        </div>
      </section>

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
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Join thousands of businesses using AI to grow faster
            </p>
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-6 text-lg"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-orange-500/20">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>&copy; 2025 NNH AI Studio. All rights reserved.</p>
        </div>
      </footer>
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
