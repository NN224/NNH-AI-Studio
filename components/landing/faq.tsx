"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does the AI generate responses?",
      answer:
        "Our AI uses advanced natural language processing to understand the context of reviews and questions, then generates personalized, human-like responses based on your business tone and preferences. You can customize the AI's style and review all responses before they're sent.",
    },
    {
      question: "Can I review responses before they're posted?",
      answer:
        "Absolutely! You have full control. You can set the AI to auto-post, require approval, or use a hybrid approach where only certain types of responses need review. Most customers start with manual approval and gradually trust the AI more.",
    },
    {
      question: "How many locations can I manage?",
      answer:
        "It depends on your plan. The Free plan supports 1 location, Pro supports up to 5 locations, and Enterprise supports unlimited locations. You can easily upgrade as your business grows.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes! We use bank-level encryption (AES-256) for all data. We're SOC 2 compliant and never share your data with third parties. Your Google Business Profile credentials are stored securely using OAuth 2.0.",
    },
    {
      question: "What languages are supported?",
      answer:
        "We support 50+ languages including English, Arabic, Spanish, French, German, Chinese, and more. The AI can automatically detect the language of incoming reviews and respond in the same language.",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes, you can cancel your subscription at any time with no penalties or fees. Your data will remain accessible for 30 days after cancellation, giving you time to export if needed.",
    },
    {
      question: "Do you offer a free trial?",
      answer:
        "Yes! All paid plans come with a 14-day free trial. No credit card required. You can test all features and see the value before committing.",
    },
    {
      question: "How long does setup take?",
      answer:
        "Most businesses are up and running in under 10 minutes. Simply connect your Google Business Profile, configure your AI preferences, and you're ready to go. We also offer free onboarding support for Enterprise customers.",
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
            FAQ
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            Frequently Asked Questions
          </h3>
          <p className="text-xl text-gray-400">Everything you need to know</p>
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
