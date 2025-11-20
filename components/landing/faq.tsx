"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function FAQSection() {
  const t = useTranslations("landing.faq");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: t("items.item1.question"),
      answer: t("items.item1.answer"),
    },
    {
      question: t("items.item2.question"),
      answer: t("items.item2.answer"),
    },
    {
      question: t("items.item3.question"),
      answer: t("items.item3.answer"),
    },
    {
      question: t("items.item4.question"),
      answer: t("items.item4.answer"),
    },
    {
      question: t("items.item5.question"),
      answer: t("items.item5.answer"),
    },
    {
      question: t("items.item6.question"),
      answer: t("items.item6.answer"),
    },
    {
      question: t("items.item7.question"),
      answer: t("items.item7.answer"),
    },
    {
      question: t("items.item8.question"),
      answer: t("items.item8.answer"),
    },
  ];

  return (
    <section id="faq" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
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
          <p className="text-xl text-gray-400">{t("description")}</p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full bg-gradient-to-br from-gray-900 to-black border border-orange-500/30 rounded-xl p-6 text-left hover:border-orange-500/50 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-lg font-semibold pr-8">{faq.question}</h4>
                  <ChevronDown
                    className={`w-5 h-5 text-orange-500 flex-shrink-0 transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </div>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-gray-400 mt-4 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
