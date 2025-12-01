"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { aiLogger } from "@/lib/utils/logger";

export function LiveDemoSection() {
  const t = useTranslations("landing.liveDemo");
  const [reviewText, setReviewText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTime, setGenerationTime] = useState(0);

  const generateResponse = async () => {
    if (!reviewText.trim()) return;

    setIsGenerating(true);
    setAiResponse("");
    const startTime = Date.now();

    try {
      const response = await fetch("/api/ai/generate-review-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewText: reviewText,
          businessName: "Demo Business",
          rating: 2, // Assume negative review for demo
        }),
      });

      const data = await response.json();
      const endTime = Date.now();
      setGenerationTime((endTime - startTime) / 1000);

      if (data.reply) {
        setAiResponse(data.reply);
      } else {
        setAiResponse(
          "Thank you for your feedback. We take your concerns seriously and would love the opportunity to make things right. Please contact us directly so we can address this matter.",
        );
      }
    } catch (error) {
      aiLogger.error(
        "Error generating response",
        error instanceof Error ? error : new Error(String(error)),
      );
      setAiResponse(
        "Thank you for your feedback. We appreciate you taking the time to share your experience with us.",
      );
      setGenerationTime(2.3);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section
      id="demo"
      className="py-20 px-4 bg-gradient-to-b from-black via-gray-900 to-black"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-sm text-orange-500 font-semibold mb-4 uppercase tracking-wider">
            {t("title")}
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-4">
            {t("subtitle")}
          </h3>
          <p className="text-gray-400 text-lg">{t("description")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500/30 rounded-2xl p-8"
        >
          {/* Input Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Write a negative review (for demo purposes)
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t("placeholder")}
              className="w-full h-32 bg-black/50 border border-orange-500/30 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateResponse}
            disabled={!reviewText.trim() || isGenerating}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 text-lg shadow-lg shadow-orange-500/50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("generating")}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {t("generateButton")}
              </>
            )}
          </Button>

          {/* AI Response */}
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 p-6 bg-green-500/10 border border-green-500/30 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-green-400" />
                <p className="text-green-400 font-semibold">
                  {t("result", { time: generationTime.toFixed(1) })}
                </p>
              </div>
              <p className="text-gray-200 leading-relaxed">{aiResponse}</p>
            </motion.div>
          )}

          {/* Note */}
          <p className="mt-6 text-sm text-gray-500 text-center italic">
            {t("note")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
