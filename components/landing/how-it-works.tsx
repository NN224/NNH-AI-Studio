"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link2, Settings, Zap, TrendingUp } from "lucide-react";

export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    {
      number: "01",
      title: t("step1.title"),
      description: t("step1.description"),
      icon: <Link2 className="w-8 h-8" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      number: "02",
      title: t("step2.title"),
      description: t("step2.description"),
      icon: <Settings className="w-8 h-8" />,
      color: "from-purple-500 to-purple-600",
    },
    {
      number: "03",
      title: t("step3.title"),
      description: t("step3.description"),
      icon: <Zap className="w-8 h-8" />,
      color: "from-orange-500 to-orange-600",
    },
    {
      number: "04",
      title: t("step4.title"),
      description: t("step4.description"),
      icon: <TrendingUp className="w-8 h-8" />,
      color: "from-green-500 to-green-600",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-black/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
            {t("title")}
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            {t("subtitle")}
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </motion.div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-orange-500/20 via-orange-500/50 to-orange-500/20" />

          {/* Steps */}
          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`flex flex-col md:flex-row items-center gap-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <div
                    className={`inline-block bg-gradient-to-r ${step.color} bg-clip-text text-transparent text-6xl font-bold mb-4`}
                  >
                    {step.number}
                  </div>
                  <h4 className="text-2xl font-bold mb-3">{step.title}</h4>
                  <p className="text-gray-400 text-lg">{step.description}</p>
                </div>

                {/* Icon */}
                <div className="relative">
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg shadow-orange-500/20`}
                  >
                    {step.icon}
                  </div>
                  {/* Pulse Effect */}
                  <div
                    className={`absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br ${step.color} animate-ping opacity-20`}
                  />
                </div>

                {/* Spacer for alternating layout */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
