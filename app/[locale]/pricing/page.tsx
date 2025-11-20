import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      description: "Perfect for small businesses",
      features: [
        "Up to 3 locations",
        "Basic analytics",
        "Review management",
        "Email support",
        "Monthly reports",
      ],
    },
    {
      name: "Professional",
      price: "$79",
      description: "For growing businesses",
      features: [
        "Up to 15 locations",
        "Advanced analytics",
        "AI-powered insights",
        "Priority support",
        "Custom reports",
        "Team collaboration",
        "API access",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      features: [
        "Unlimited locations",
        "Enterprise analytics",
        "Dedicated account manager",
        "24/7 phone support",
        "Custom integrations",
        "White-label options",
        "SLA guarantee",
        "Advanced security",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 max-w-7xl relative">
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold mb-4 text-balance">
                Simple, Transparent Pricing
              </h1>
              <p className="text-gray-400 text-lg">
                Choose the plan that fits your business needs
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-[#0A0A0A] rounded-lg p-8 ${
                    plan.popular
                      ? "border-2 border-orange-500 relative"
                      : "border border-orange-500/20"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 mb-6">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Custom" && (
                      <span className="text-gray-400">/month</span>
                    )}
                  </div>
                  <Button className="w-full mb-6 bg-orange-500 hover:bg-orange-600 text-white">
                    Get Started
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2">
                    Can I change plans later?
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Yes, you can upgrade or downgrade your plan at any time.
                    Changes take effect immediately.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                  <p className="text-gray-400 text-sm">
                    Yes, all plans come with a 14-day free trial. No credit card
                    required.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    What payment methods do you accept?
                  </h3>
                  <p className="text-gray-400 text-sm">
                    We accept all major credit cards, PayPal, and wire transfers
                    for Enterprise plans.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                  <p className="text-gray-400 text-sm">
                    Yes, you can cancel your subscription at any time. No
                    long-term contracts required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
