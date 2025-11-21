"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function PricingComparisonSection() {
  const t = useTranslations("landing.pricing.comparison");

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-black via-gray-900/50 to-black">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("title")}</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NNH AI */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-2 border-green-500/50 rounded-2xl p-8"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-green-400 mb-2">
                {t("nnh.title")}
              </h3>
              <div className="inline-block bg-green-500/20 border border-green-500/50 rounded-full px-4 py-1">
                <span className="text-green-400 font-semibold text-sm">
                  Best Value
                </span>
              </div>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-200">
                <span className="text-xl">{t("nnh.feature1")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-200">
                <span className="text-xl">{t("nnh.feature2")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-200">
                <span className="text-xl">{t("nnh.feature3")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-200">
                <span className="text-xl">{t("nnh.feature4")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-200">
                <span className="text-xl">{t("nnh.feature5")}</span>
              </li>
            </ul>
          </motion.div>

          {/* Competitors */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-2 border-red-500/30 rounded-2xl p-8 opacity-75"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-red-400 mb-2">
                {t("competitors.title")}
              </h3>
              <div className="inline-block bg-red-500/20 border border-red-500/50 rounded-full px-4 py-1">
                <span className="text-red-400 font-semibold text-sm">
                  Outdated
                </span>
              </div>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-400">
                <span className="text-xl">{t("competitors.feature1")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <span className="text-xl">{t("competitors.feature2")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <span className="text-xl">{t("competitors.feature3")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <span className="text-xl">{t("competitors.feature4")}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <span className="text-xl">{t("competitors.feature5")}</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
