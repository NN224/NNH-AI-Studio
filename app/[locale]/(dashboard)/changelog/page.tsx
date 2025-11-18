'use client';

import { motion } from 'framer-motion';
import { Sparkles, Plus, Wrench, Bug, Zap, Calendar } from 'lucide-react';
import { BetaBadge } from '@/components/common/beta-badge';
import { useTranslations } from 'next-intl';

interface ChangelogEntry {
  date: string;
  version: string;
  changes: {
    type: 'feature' | 'improvement' | 'bugfix' | 'performance';
    title: string;
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    date: 'Nov 18, 2025',
    version: '0.9.0',
    changes: [
      {
        type: 'feature',
        title: 'AI-Powered Auto-Reply',
        description: 'Automatically respond to reviews with intelligent, personalized replies using multiple AI providers',
      },
      {
        type: 'feature',
        title: 'Per-Rating Auto-Reply Controls',
        description: 'Fine-tune auto-reply settings for each star rating (1-5 stars)',
      },
      {
        type: 'improvement',
        title: 'Settings Page Redesign',
        description: 'Complete overhaul of settings interface with better organization and UX',
      },
      {
        type: 'bugfix',
        title: 'Fixed Business Info Display',
        description: 'Resolved React rendering errors for service items and business hours',
      },
    ],
  },
  {
    date: 'Nov 15, 2025',
    version: '0.8.5',
    changes: [
      {
        type: 'feature',
        title: 'Questions Bulk Actions',
        description: 'Select and manage multiple questions at once with bulk operations',
      },
      {
        type: 'improvement',
        title: 'Locale Detection',
        description: 'Improved language detection and URL routing for Arabic and English',
      },
      {
        type: 'performance',
        title: 'Dashboard Loading Speed',
        description: 'Optimized dashboard queries and caching for faster load times',
      },
    ],
  },
  {
    date: 'Nov 10, 2025',
    version: '0.8.0',
    changes: [
      {
        type: 'feature',
        title: 'Multi-AI Provider Support',
        description: 'Added support for Gemini, DeepSeek, Groq, Anthropic, and OpenAI',
      },
      {
        type: 'feature',
        title: 'Business Features Management',
        description: 'Comprehensive interface for managing Google Business Profile attributes',
      },
      {
        type: 'improvement',
        title: 'Mobile Navigation',
        description: 'Enhanced mobile experience with improved navigation and responsiveness',
      },
    ],
  },
];

const typeConfig = {
  feature: {
    icon: Plus,
    label: 'New Feature',
    color: 'text-green-400 bg-green-500/20 border-green-500/30',
  },
  improvement: {
    icon: Wrench,
    label: 'Improvement',
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  },
  bugfix: {
    icon: Bug,
    label: 'Bug Fix',
    color: 'text-red-400 bg-red-500/20 border-red-500/30',
  },
  performance: {
    icon: Zap,
    label: 'Performance',
    color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  },
};

export default function ChangelogPage() {
  const t = useTranslations('Changelog');

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-3xl font-bold">What's New</h1>
            <p className="text-sm text-muted-foreground">
              Latest updates and improvements
            </p>
          </div>
          <BetaBadge variant="positive" size="md" />
        </div>
      </motion.div>

      {/* Changelog Entries */}
      <div className="space-y-8">
        {changelog.map((entry, index) => (
          <motion.div
            key={entry.version}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Timeline line */}
            {index < changelog.length - 1 && (
              <div className="absolute left-4 top-12 bottom-0 w-px bg-gradient-to-b from-zinc-700 to-transparent" />
            )}

            <div className="flex gap-4">
              {/* Date badge */}
              <div className="relative flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-400">
                    {entry.date}
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-400">
                    {entry.version}
                  </span>
                </div>

                <div className="space-y-3">
                  {entry.changes.map((change, changeIndex) => {
                    const config = typeConfig[change.type];
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={changeIndex}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + changeIndex * 0.05 }}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded p-1.5 border ${config.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">
                                {change.title}
                              </h3>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {change.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-6 text-center"
      >
        <Sparkles className="mx-auto h-8 w-8 text-emerald-400 mb-3" />
        <h3 className="text-lg font-semibold mb-2">Have feedback or suggestions?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We'd love to hear from you! Your input helps us build better features.
        </p>
        <a
          href="mailto:feedback@nnh.ae"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
        >
          Share Feedback
        </a>
      </motion.div>
    </div>
  );
}

