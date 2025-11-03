'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
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
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              <LayoutDashboard className="w-5 h-5" />
              Go to Dashboard
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
        <Card className="border border-primary/20 mt-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
            <CardDescription>Navigate to common pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Locations', href: '/dashboard/locations' },
                { label: 'Reviews', href: '/dashboard/reviews' },
                { label: 'Media', href: '/dashboard/media' },
                { label: 'Analytics', href: '/dashboard/analytics' },
                { label: 'Settings', href: '/dashboard/settings' },
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
    </div>
  );
}

