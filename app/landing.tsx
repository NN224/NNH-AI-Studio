"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, BarChart3, MapPin, MessageSquare, Sparkles, Check, Play, Activity, Video, Star, Shield, Globe, Users, TrendingUp, Award, Headphones, Building2, Briefcase, Zap, ChevronDown, ChevronUp, Clock } from "lucide-react"
import { useState } from "react"

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const faqs = [
    {
      question: "Can NNH AI Studio help me create & verify my Business Location?",
      answer: "Yes! NNH AI Studio provides comprehensive assistance for creating, verifying, and managing your Google Business Profile locations. Our platform guides you through the entire process and helps you secure your listings."
    },
    {
      question: "Which Directories are synced with NNH AI Studio?",
      answer: "NNH AI Studio integrates with major directories including Google My Business, YouTube, Bing, Apple Maps, ChatGPT, Instagram, Facebook, and many more. We continuously add new integrations to ensure maximum visibility."
    },
    {
      question: "How can NNH AI Studio help my Business Rank better on Local Search?",
      answer: "NNH AI Studio helps improve your local search rankings through AI-powered content optimization, review management, keyword tracking, profile enhancement, and real-time analytics. Our platform provides personalized tasks and recommendations to boost your visibility."
    },
    {
      question: "Does NNH AI Studio help with Reviews & Reputation Management?",
      answer: "Absolutely! NNH AI Studio offers AI-powered review response generation, sentiment analysis, review monitoring, and automated reply suggestions. Manage all your reviews and maintain a positive online reputation from one dashboard."
    },
    {
      question: "Do you have solutions for Brands & Agencies with Multiple Locations?",
      answer: "Yes! NNH AI Studio offers specialized solutions for agencies and multi-location brands, including white-label dashboards, bulk verification assistance, team collaboration tools, advanced analytics, and custom pricing plans tailored to your needs."
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/20 bg-black/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">NNH AI Studio</span>
              </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </a>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-primary/30 text-foreground hover:bg-primary/10 bg-transparent"
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </nav>
            {/* Mobile Sign In button */}
            <div className="md:hidden">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-primary/30 text-foreground hover:bg-primary/10 bg-transparent"
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />

        <div className="relative container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <span className="text-sm font-medium text-primary">4.9 out of 5</span>
              <span className="text-sm text-muted-foreground">• Trusted by 1,000+ Businesses</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Manage Your Google My Business & YouTube Channels Like a Pro
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The ultimate AI-powered platform for managing multiple GMB locations, YouTube channels, responding to reviews with AI, creating content, and growing your online presence all from one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-lg px-8"
              >
                <Link href="/auth/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 text-lg px-8 bg-transparent"
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Location Management</h3>
              <p className="text-muted-foreground text-sm">Manage all your GMB locations from one powerful dashboard</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Play className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">YouTube Management</h3>
              <p className="text-muted-foreground text-sm">
                Manage your YouTube channel, videos, comments, and analytics from one place
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Reviews</h3>
              <p className="text-muted-foreground text-sm">
                Generate intelligent responses to reviews with advanced AI
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground text-sm">Track performance with detailed insights and reports for both GMB and YouTube</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Video Analytics</h3>
              <p className="text-muted-foreground text-sm">Analyze video performance, engagement rates, and audience insights</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-muted-foreground text-sm">Monitor comments, reviews, and engagement across all platforms in real-time</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Content Studio</h3>
              <p className="text-muted-foreground text-sm">Create engaging posts, videos, and content with AI assistance</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comment Management</h3>
              <p className="text-muted-foreground text-sm">Manage and respond to YouTube comments efficiently with AI-powered tools</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators Section */}
      <section className="py-12 bg-card/30 border-y border-primary/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">Money back guarantee</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Globe className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">Works in every country</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Check className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">No long-term commitment</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">Trusted by 1,000+ Businesses</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Headphones className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground">24/7 Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Results Section */}
      <section className="py-24 bg-gradient-to-b from-card/50 to-transparent">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">OUR PROMISE</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Level up your Local SEO</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">2X</div>
              <p className="text-muted-foreground">More Storefront Visits</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">+300%</div>
              <p className="text-muted-foreground">Local Impressions</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">+60%</div>
              <p className="text-muted-foreground">More Phone Calls</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card border border-primary/30">
              <Star className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold mb-2">+150%</div>
              <p className="text-muted-foreground">Reviews Growth</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-gradient-to-b from-transparent to-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and transform your Google My Business and YouTube management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="relative">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="text-2xl font-semibold">Connect Your Accounts</h3>
                <p className="text-muted-foreground">
                  Link your Google My Business accounts and YouTube channels, import all your locations and videos in seconds
                </p>
              </div>
              <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
            </div>

            <div className="relative">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h3 className="text-2xl font-semibold">Manage & Respond</h3>
                <p className="text-muted-foreground">
                  Monitor reviews and comments, respond with AI assistance, manage all locations and YouTube content from one dashboard
                </p>
              </div>
              <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-semibold">Grow Your Business</h3>
              <p className="text-muted-foreground">
                Track analytics, optimize performance, and watch your online presence grow
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies/Testimonials Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">CUSTOMER LOVE</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Customers Get Results</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See What Our Customers Have To Say About Us
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-card to-secondary border border-primary/30">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6">
                "NNH AI Studio helped us drastically scale our visibility across search and map listings. With a 900% boost in impressions and a massive rise in website clicks, our local SEO has never been stronger."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">John Smith</p>
                  <p className="text-sm text-muted-foreground">CEO, Local Business Co.</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-primary/20 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-primary">900%</div>
                  <p className="text-sm text-muted-foreground">Impressions Growth</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">600%</div>
                  <p className="text-sm text-muted-foreground">Website Clicks</p>
                </div>
              </div>
            </div>
            {/* Testimonial 2 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-card to-secondary border border-primary/30">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6">
                "With NNH AI Studio, we enhanced our discoverability for health seekers. The rise in call clicks and impressions directly reflects the platform's efficiency in reaching intent-driven users."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">Marketing Director, Health Solutions</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-primary/20 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-primary">250%</div>
                  <p className="text-sm text-muted-foreground">Search Impressions</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">240%</div>
                  <p className="text-sm text-muted-foreground">Call Clicks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Dashboard</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your Google My Business locations and YouTube channels in one beautiful interface
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="relative rounded-2xl border border-primary/30 overflow-hidden bg-gradient-to-br from-card to-secondary p-8">
              <div className="aspect-video rounded-xl border border-primary/20 bg-black/50 flex items-center justify-center relative overflow-hidden">
                <img
                  src="/modern-dark-dashboard-interface-with-charts-and-an.jpg"
                  alt="Dashboard Preview"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 rounded-full bg-primary/30">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-accent" />
                    </div>
                    <span className="text-sm text-muted-foreground">Real-time Analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Tools Section */}
      <section className="py-24 bg-gradient-to-b from-card/30 to-transparent">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">Free Tool Feature</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Free Google My Business Optimization Tools</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Harness the power of Generative AI to Improve Local SEO of your Google My Business Profile for Free
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <Sparkles className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI Review Reply Generator</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Use AI to generate customizable & engaging Customer Review Replies for Free.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Explore Now</Link>
              </Button>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <Award className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Profile Strength Calculator</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Get a profile strength of your Google My Business Profile to find the missing gaps in the local SEO for free.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Calculate Now</Link>
              </Button>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <BarChart3 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Free GMB Profile Audit</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Audit your Local Business Profile for free and find scope for improvement in the Local SEO and Content Updates.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Audit Now</Link>
              </Button>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Category Generator</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Get Additional Category suggestions based on the Primary Category of your Profile.
              </p>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/auth/signup">Generate Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your business needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Up to 3 locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Basic analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Review monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Email support</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full border-primary/30 hover:bg-primary/10 bg-transparent">
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Up to 25 locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">AI-powered responses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Custom reports</span>
                </li>
              </ul>
              <Button
                asChild
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
              >
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>

            {/* Agency Plan */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Agency</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$149</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Unlimited locations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">White-label solution</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Team collaboration</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">API access</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full border-primary/30 hover:bg-primary/10 bg-transparent">
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions for Different Users */}
      <section className="py-24 bg-gradient-to-b from-transparent to-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">MADE FOR ALL</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Features Designed for teams of every type & size</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              NNH AI Studio is designed for every type of team and their needs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Solo Storefronts */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <Building2 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Solo Storefronts</h3>
              <ul className="space-y-3 mb-6 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Manage Business Profiles & get Complete Audit</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Check Reviews, Sentiment Analysis & set AI Replies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Track Rank on Local Keywords & Check Geo Grid Rank</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Analyze Local Competitors & check their best practices</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signup">Explore Now →</Link>
              </Button>
            </div>
            {/* Agencies */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold">
                Most Popular
              </div>
              <Briefcase className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Agencies</h3>
              <ul className="space-y-3 mb-6 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Connect & manage Multiple Locations on a single dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>White-label dashboard as per your needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Get Advanced Data Analytics & Custom Reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Manage Locations at scale & publish content with help of AI</span>
                </li>
              </ul>
              <Button asChild className="w-full bg-gradient-to-r from-primary to-accent">
                <Link href="/auth/signup">Explore Now →</Link>
              </Button>
            </div>
            {/* Multi-Location Brands */}
            <div className="p-8 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Multi-Location Brands</h3>
              <ul className="space-y-3 mb-6 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Assistance for Google Business Profile Bulk Verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Invite Team Members based on roles & share access within the team</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Leverage content library to save evergreen and reusable content</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Get 24 X 7 Support & Custom Pricing Plans</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/contact">Contact Sales →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-24 bg-gradient-to-b from-card/50 to-transparent">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">Integrations</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Direct Integration With Directories</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Link your Business Profiles with Multiple Directories, CRMs & more
            </p>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-8 max-w-6xl mx-auto items-center justify-items-center">
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Google</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">YouTube</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Bing</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Apple</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">ChatGPT</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Instagram</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">Facebook</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-primary/20 hover:border-primary/40 transition-all">
              <div className="text-2xl font-bold text-primary">+ More</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-gradient-to-b from-transparent to-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary mb-4 block">FAQs</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-primary/30 rounded-xl bg-card overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
                >
                  <span className="text-left font-semibold">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-primary/20 via-transparent to-accent/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold">Try NNH AI Studio for Free today</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find out if NNH AI Studio helps your Local Business Grow with <span className="text-primary font-semibold">7 Days Free Trial. No Credit Card Required.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white text-lg px-8"
              >
                <Link href="/auth/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 text-lg px-8 bg-transparent"
              >
                <Link href="/contact">Schedule Demo</Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 pt-8 max-w-2xl mx-auto">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-primary/20">
                <Headphones className="w-8 h-8 text-primary" />
                <p className="font-semibold">Dedicated Business Coach</p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-primary/20">
                <Sparkles className="w-8 h-8 text-primary" />
                <p className="font-semibold">Access All Features</p>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-primary/20">
                <Clock className="w-8 h-8 text-primary" />
                <p className="font-semibold">24/7 Real Time Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-primary/20 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">NNH AI Studio</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                The ultimate AI-powered platform for managing Google My Business locations and YouTube channels. Automate reviews, create content, and grow your online presence.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/pricing" className="hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-primary transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <a href="#features" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-primary transition-colors">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-primary transition-colors">
                    FAQs
                  </a>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Book a Demo
                  </Link>
                </li>
                <li>
                  <a href="/auth/signup" className="hover:text-primary transition-colors">
                    Free Trial
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              &copy; {new Date().getFullYear()} NNH AI Studio. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground text-center md:text-right">
              NNH AI Studio's use and transfer to any other app of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
