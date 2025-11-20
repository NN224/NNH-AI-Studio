'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, Sparkles, BookOpen, Video } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  learnMoreUrl?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  learnMoreUrl,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-[400px] p-4"
    >
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="mb-4 flex justify-center">
            {icon || (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6">{description}</p>
          
          <div className="space-y-2">
            {action}
            {secondaryAction}
            {learnMoreUrl && (
              <Link href={learnMoreUrl} target="_blank">
                <Button variant="ghost" size="sm" className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Learn more
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Preset: GMB Connection
interface GMBConnectionEmptyStateProps {
  onConnect?: () => void;
  isLoading?: boolean;
}

export function GMBConnectionEmptyState({ 
  onConnect, 
  isLoading = false 
}: GMBConnectionEmptyStateProps) {
  return (
    <EmptyState
      title="Connect Your Google Business Profile"
      description="Get started by connecting your Google Business Profile to manage reviews, questions, and posts all in one place."
      icon={
        <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <Link2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      }
      action={
        <Button 
          size="lg" 
          className="w-full" 
          onClick={onConnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Connect Google Business Profile
            </>
          )}
        </Button>
      }
      secondaryAction={
        <Link href="https://business.google.com" target="_blank">
          <Button variant="outline" size="sm" className="w-full">
            Don't have a Google Business Profile?
          </Button>
        </Link>
      }
      learnMoreUrl="https://support.google.com/business/answer/2911778"
    />
  );
}

// Preset: No Reviews
export function NoReviewsEmptyState() {
  return (
    <EmptyState
      title="No Reviews Yet"
      description="Once you connect your Google Business Profile and sync your data, your reviews will appear here."
      icon={
        <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
        </div>
      }
      action={
        <Button size="lg" className="w-full" asChild>
          <Link href="/settings/connections">
            Sync Reviews
          </Link>
        </Button>
      }
    />
  );
}

// Preset: No Questions
export function NoQuestionsEmptyState() {
  return (
    <EmptyState
      title="No Questions Yet"
      description="Customer questions from your Google Business Profile will appear here once you sync your data."
      icon={
        <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
      }
      action={
        <Button size="lg" className="w-full" asChild>
          <Link href="/settings/connections">
            Sync Questions
          </Link>
        </Button>
      }
    />
  );
}

// Preset: Setup AI
export function SetupAIEmptyState() {
  return (
    <EmptyState
      title="Setup AI Assistant"
      description="Configure your AI settings to enable automatic review replies and question answers."
      icon={
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
      }
      action={
        <Button size="lg" className="w-full" asChild>
          <Link href="/settings/ai">
            Configure AI Settings
          </Link>
        </Button>
      }
      secondaryAction={
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="#">
            <Video className="mr-2 h-4 w-4" />
            Watch Tutorial
          </Link>
        </Button>
      }
    />
  );
}
