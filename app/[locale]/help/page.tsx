"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LifeBuoy,
  Search,
  Book,
  Video,
  FileText,
  MessageCircle,
  Zap,
  Settings,
  BarChart3,
  Users,
  Globe,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { useState, useEffect } from "react";

export default function HelpCenterPage() {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Help Center | NNH - AI Studio";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Browse our comprehensive help center for guides, tutorials, and documentation to get the most out of NNH AI Studio.",
      );
    }
  }, []);

  const categories = [
    {
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics of NNH AI Studio",
      articleCount: 12,
      href: "/help/getting-started",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Zap,
      title: "Features & Tools",
      description: "Explore all available features",
      articleCount: 24,
      href: "/help/features",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Settings,
      title: "Account & Settings",
      description: "Manage your account preferences",
      articleCount: 15,
      href: "/help/account",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Understanding your data",
      articleCount: 18,
      href: "/help/analytics",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Collaborate with your team",
      articleCount: 10,
      href: "/help/team",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      icon: Globe,
      title: "Integrations",
      description: "Connect with other platforms",
      articleCount: 8,
      href: "/help/integrations",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      icon: Shield,
      title: "Security & Privacy",
      description: "Keep your data safe",
      articleCount: 6,
      href: "/help/security",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      icon: FileText,
      title: "Billing & Plans",
      description: "Subscription and payment help",
      articleCount: 9,
      href: "/help/billing",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const popularArticles = [
    {
      title: "How to connect your Google My Business account",
      category: "Getting Started",
      readTime: "3 min read",
    },
    {
      title: "Setting up AI-powered auto-replies for reviews",
      category: "Features",
      readTime: "5 min read",
    },
    {
      title: "Understanding your analytics dashboard",
      category: "Analytics",
      readTime: "4 min read",
    },
    {
      title: "Managing multiple locations efficiently",
      category: "Features",
      readTime: "6 min read",
    },
  ];

  const quickLinks = [
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Watch step-by-step guides",
      href: "/help/videos",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our support team",
      href: "/contact",
    },
    {
      icon: FileText,
      title: "API Documentation",
      description: "For developers",
      href: "/docs",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 max-w-6xl relative">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <LifeBuoy className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Help Center
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                Find guides, tutorials, and answers to help you get the most out
                of NNH AI Studio
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search for help articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 bg-background border-border/40 text-lg"
                  />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Card className="border-border/40 bg-card/50 backdrop-blur hover:border-primary/50 transition-all group cursor-pointer h-full">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                              {link.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {link.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Categories */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Link key={category.href} href={category.href}>
                      <Card className="border-border/40 bg-card/50 backdrop-blur hover:border-primary/50 transition-all group cursor-pointer h-full">
                        <CardContent className="pt-6 pb-6">
                          <div
                            className={`p-3 rounded-lg ${category.bgColor} mb-4 w-fit group-hover:scale-110 transition-transform`}
                          >
                            <Icon className={`w-6 h-6 ${category.color}`} />
                          </div>
                          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {category.description}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {category.articleCount} articles
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Popular Articles */}
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Popular Articles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {popularArticles.map((article, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group"
                    >
                      <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{article.category}</span>
                        <span>•</span>
                        <span>{article.readTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="border-primary/30 bg-primary/5 mt-12">
              <CardContent className="pt-6 pb-6">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">
                    Can't find what you're looking for?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Our support team is available 24/7 to help you with any
                    questions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg">
                      <Link href="/contact">Contact Support</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/faq">View FAQ</Link>
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
