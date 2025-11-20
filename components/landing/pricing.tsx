"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Free",
      price: { monthly: 0, annual: 0 },
      description: "Perfect for trying out",
      features: [
        "1 Location",
        "50 AI Responses/month",
        "Basic Analytics",
        "Email Support",
        "7-day Response Time",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: { monthly: 49, annual: 470 },
      description: "For growing businesses",
      features: [
        "5 Locations",
        "Unlimited AI Responses",
        "Advanced Analytics",
        "Priority Support",
        "Custom AI Training",
        "Multi-language Support",
        "API Access",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: { monthly: 199, annual: 1910 },
      description: "For large organizations",
      features: [
        "Unlimited Locations",
        "Unlimited Everything",
        "White-label Solution",
        "Dedicated Account Manager",
        "Custom Integrations",
        "SLA Guarantee",
        "Advanced Security",
        "Training & Onboarding",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
            Pricing
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your Plan
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Start free, scale as you grow
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 bg-gray-900 rounded-full p-1 border border-orange-500/20">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full transition-all ${
                !isAnnual
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full transition-all ${
                isAnnual
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Annual
              <Badge className="ml-2 bg-green-500 text-white border-0">
                Save 20%
              </Badge>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-gradient-to-br from-gray-900 to-black border rounded-2xl p-8 ${
                plan.popular
                  ? "border-orange-500 shadow-lg shadow-orange-500/20 scale-105"
                  : "border-orange-500/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white border-0 px-4 py-1">
                    <Sparkles className="w-3 h-3 mr-1 inline" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold mb-2">{plan.name}</h4>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-orange-500">
                    ${isAnnual ? plan.price.annual : plan.price.monthly}
                  </span>
                  <span className="text-gray-400">
                    /{isAnnual ? "year" : "month"}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/auth/signup" className="block">
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
