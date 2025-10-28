import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, BarChart3, MapPin, MessageSquare, Sparkles, Check } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/20 bg-black/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">GMB Platform</span>
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
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Manage Your Google My Business Like a Pro
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The ultimate platform for managing multiple GMB locations, responding to reviews with AI, and growing your
              online presence.
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
              <p className="text-muted-foreground text-sm">Track performance with detailed insights and reports</p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Content Studio</h3>
              <p className="text-muted-foreground text-sm">Create engaging posts and content with AI assistance</p>
            </div>
          </div>
        </div>
      </div>

      <section id="how-it-works" className="py-24 bg-gradient-to-b from-transparent to-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and transform your GMB management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="relative">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="text-2xl font-semibold">Connect Your Locations</h3>
                <p className="text-muted-foreground">
                  Link your Google My Business accounts and import all your locations in seconds
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
                  Monitor reviews, respond with AI assistance, and manage all locations from one dashboard
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

      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Dashboard</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your GMB presence in one beautiful interface
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

      <section className="py-24 bg-gradient-to-br from-primary/20 via-transparent to-accent/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold">Ready to Transform Your GMB Management?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of businesses already using our platform to grow their online presence
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
            <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-primary/20 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">GMB Platform</h3>
              <p className="text-sm text-muted-foreground">
                The ultimate Google My Business management solution for modern businesses.
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
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Contact
                  </Link>
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
          <div className="mt-8 pt-8 border-t border-primary/20 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} GMB Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
