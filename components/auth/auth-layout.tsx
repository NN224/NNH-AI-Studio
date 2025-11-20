"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Sparkles, Shield, Users, Zap, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBenefits?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showBenefits = true,
}: AuthLayoutProps) {
  const benefits = [
    {
      icon: Sparkles,
      title: "AI-Powered Automation",
      description: "Automate review responses with advanced AI",
    },
    {
      icon: Users,
      title: "10,000+ Happy Users",
      description: "Join thousands of successful businesses",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption & data protection",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get started in under 5 minutes",
    },
  ];

  const testimonial = {
    text: "NNH AI Studio transformed how we manage customer reviews. Response time decreased by 80%!",
    author: "Sarah Johnson",
    role: "Marketing Director",
    company: "TechCorp",
    rating: 5,
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
        {/* Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">N</span>
            </div>
            <span className="text-lg sm:text-xl font-bold">NNH AI Studio</span>
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
              {subtitle && (
                <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
                  {subtitle}
                </p>
              )}

              {children}
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 text-center text-xs sm:text-sm text-gray-400">
          <p>
            © 2024 NNH AI Studio. All rights reserved.{" "}
            <Link
              href="/privacy"
              className="hover:text-orange-500 transition-colors"
            >
              Privacy
            </Link>
            {" · "}
            <Link
              href="/terms"
              className="hover:text-orange-500 transition-colors"
            >
              Terms
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Benefits & Testimonial */}
      {showBenefits && (
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-black border-l border-gray-800 flex-col justify-between p-12">
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

          {/* Benefits */}
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold mb-8">
                Why Choose{" "}
                <span className="text-orange-500">NNH AI Studio</span>?
              </h2>

              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <benefit.icon className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-sm text-gray-400">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="relative z-10 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6"
          >
            <div className="flex gap-1 mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-orange-500 text-orange-500"
                />
              ))}
            </div>
            <p className="text-gray-300 mb-4 italic">
              &ldquo;{testimonial.text}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-orange-500">
                  {testimonial.author.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm">{testimonial.author}</p>
                <p className="text-xs text-gray-400">
                  {testimonial.role} at {testimonial.company}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="relative z-10 grid grid-cols-3 gap-6 mt-8"
          >
            {[
              { value: "10K+", label: "Active Users" },
              { value: "50+", label: "Countries" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
