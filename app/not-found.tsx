'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/nnh-logo.png"
              alt="NNH Logo"
              width={64}
              height={64}
              className="opacity-80"
            />
          </div>

          {/* 404 Content */}
          <div className="space-y-4">
            <h1 className="text-9xl font-bold gradient-text-orange">
              404
            </h1>
            <h2 className="text-3xl font-bold text-foreground">
              Page Not Found
            </h2>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2 gradient-orange">
              <Link href="/en/home">
                <Home className="w-5 h-5" />
                Go to Home
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2" 
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </Button>
          </div>

          {/* Quick Links */}
          <Card className="border border-primary/20 glass mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
              <CardDescription>Navigate to common pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Dashboard', href: '/en/dashboard' },
                  { label: 'YouTube Dashboard', href: '/en/youtube-dashboard' },
                  { label: 'GMB Posts', href: '/en/posts' },
                  { label: 'Analytics', href: '/en/analytics' },
                  { label: 'About', href: '/en/about' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}

