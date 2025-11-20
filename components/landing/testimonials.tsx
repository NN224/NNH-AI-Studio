"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useState } from "react";

export function TestimonialsSection() {
  const t = useTranslations("landing.testimonials");
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      name: t("items.item1.name"),
      role: t("items.item1.role"),
      company: t("items.item1.company"),
      image: "👩‍💼",
      rating: 5,
      text: t("items.item1.text"),
    },
    {
      name: t("items.item2.name"),
      role: t("items.item2.role"),
      company: t("items.item2.company"),
      image: "👨‍💼",
      rating: 5,
      text: t("items.item2.text"),
    },
    {
      name: t("items.item3.name"),
      role: t("items.item3.role"),
      company: t("items.item3.company"),
      image: "👨‍💼",
      rating: 5,
      text: t("items.item3.text"),
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-900">
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

        {/* Main Testimonial */}
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/30 rounded-2xl p-8 md:p-12 relative">
            <Quote className="absolute top-6 right-6 w-16 h-16 text-orange-500/10" />

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-3xl">
                {testimonials[activeIndex].image}
              </div>
              <div>
                <h4 className="text-xl font-bold">
                  {testimonials[activeIndex].name}
                </h4>
                <p className="text-gray-400">
                  {testimonials[activeIndex].role}
                </p>
                <p className="text-sm text-orange-500">
                  {testimonials[activeIndex].company}
                </p>
              </div>
            </div>

            <div className="flex gap-1 mb-4">
              {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-orange-500 text-orange-500"
                />
              ))}
            </div>

            <p className="text-xl text-gray-300 leading-relaxed">
              "{testimonials[activeIndex].text}"
            </p>
          </div>
        </motion.div>

        {/* Thumbnails */}
        <div className="flex justify-center gap-4">
          {testimonials.map((testimonial, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                activeIndex === index
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 scale-110"
                  : "bg-gray-800 hover:bg-gray-700 opacity-50 hover:opacity-100"
              }`}
            >
              {testimonial.image}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
