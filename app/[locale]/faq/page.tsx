"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  Search,
  ChevronDown,
  MessageCircle,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    document.title = "FAQ - Frequently Asked Questions | NNH - AI Studio";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Find answers to common questions about NNH AI Studio features, pricing, integrations, and support.",
      );
    }
  }, []);

  const faqs: FAQItem[] = [
    {
      category: "Getting Started",
      question: "How do I connect my Google My Business account?",
      answer:
        "Go to Settings > Connections, click 'Connect GMB Account', and follow the authentication flow. You'll need to grant permissions to manage your business profiles.",
    },
    {
      category: "Getting Started",
      question: "Can I manage multiple locations?",
      answer:
        "Yes! NNH AI Studio supports unlimited locations. Once you connect your GMB account, all your business locations will be automatically imported.",
    },
    {
      category: "Features",
      question: "How does AI-powered review response work?",
      answer:
        "Our AI analyzes each review's sentiment and context, then generates personalized, professional responses. You can customize AI settings, review before sending, or enable auto-reply for specific rating levels.",
    },
    {
      category: "Features",
      question: "What AI providers do you support?",
      answer:
        "We support OpenAI (GPT-4), Google Gemini, Anthropic Claude, and Groq. You can switch between providers and customize AI behavior for different tasks.",
    },
    {
      category: "Billing",
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, Mastercard, American Express), as well as PayPal. Enterprise customers can also pay via invoice.",
    },
    {
      category: "Billing",
      question: "Can I cancel my subscription anytime?",
      answer:
        "Yes, you can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.",
    },
    {
      category: "Security",
      question: "How do you protect my data?",
      answer:
        "We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We're SOC 2 Type II certified and GDPR compliant.",
    },
    {
      category: "Security",
      question: "Do you have access to my Google My Business data?",
      answer:
        "We only access the data necessary to provide our services, and we never sell or share your data with third parties. You can revoke access at any time.",
    },
    {
      category: "Integration",
      question: "Do you integrate with other platforms?",
      answer:
        "Yes, we integrate with Google My Business, YouTube, and various CRM systems. More integrations are coming soon.",
    },
    {
      category: "Integration",
      question: "Can I export my data?",
      answer:
        "Absolutely! You can export all your data (reviews, responses, analytics) in CSV or JSON format at any time from your dashboard.",
    },
    {
      category: "Support",
      question: "What support options are available?",
      answer:
        "We offer email support for all plans, live chat for Professional plans, and dedicated phone support for Enterprise customers. Average response time is under 2 hours.",
    },
    {
      category: "Support",
      question: "Do you offer training or onboarding?",
      answer:
        "Yes! All new customers get a free onboarding session. Enterprise customers receive customized training for their team.",
    },
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const categories = Array.from(new Set(faqs.map((faq) => faq.category)));

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 max-w-4xl relative">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <HelpCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Frequently Asked Questions
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Find answers to common questions about NNH AI Studio
              </p>
            </div>

            {/* Search */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-background border-border/40 text-lg"
                />
              </div>
            </div>

            {/* FAQs by Category */}
            <div className="space-y-8">
              {categories.map((category) => {
                const categoryFAQs = filteredFAQs.filter(
                  (faq) => faq.category === category,
                );

                if (categoryFAQs.length === 0) return null;

                return (
                  <div key={category}>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <span className="text-primary">#</span>
                      {category}
                    </h2>
                    <div className="space-y-3">
                      {categoryFAQs.map((faq) => {
                        const globalIndex = faqs.indexOf(faq);
                        const isOpen = openIndex === globalIndex;

                        return (
                          <Card
                            key={globalIndex}
                            className="border-border/40 bg-card/50 backdrop-blur overflow-hidden"
                          >
                            <button
                              onClick={() =>
                                setOpenIndex(isOpen ? null : globalIndex)
                              }
                              className="w-full text-left"
                            >
                              <CardContent className="pt-6 pb-6">
                                <div className="flex items-start justify-between gap-4">
                                  <h3 className="font-semibold text-lg flex-1">
                                    {faq.question}
                                  </h3>
                                  <ChevronDown
                                    className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                                {isOpen && (
                                  <p className="mt-4 text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                  </p>
                                )}
                              </CardContent>
                            </button>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No Results */}
            {filteredFAQs.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or contact our support team
                </p>
              </div>
            )}

            {/* Still Have Questions */}
            <Card className="border-primary/30 bg-primary/5 mt-12">
              <CardContent className="pt-6 pb-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">
                    Still have questions?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Can't find the answer you're looking for? Our support team
                    is here to help.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/contact">
                        <Mail className="w-4 h-4" />
                        Contact Support
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="gap-2"
                    >
                      <Link href="/help">
                        <MessageCircle className="w-4 h-4" />
                        Help Center
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
