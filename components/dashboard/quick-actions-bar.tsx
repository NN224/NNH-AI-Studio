'use client';

import { Card } from '@/components/ui/card';
import { Link } from '@/lib/navigation';
import {
  MessageSquare,
  HelpCircle,
  FileText,
  ArrowRight,
  Zap,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

interface QuickActionBadge {
  text: string;
  tone: 'attention' | 'success' | 'neutral';
  icon?: React.ReactNode;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  href: string;
  status: 'attention' | 'success' | 'neutral';
  badge?: QuickActionBadge;
}

interface QuickActionsBarProps {
  pendingReviews: number;
  unansweredQuestions: number;
  totalLocations?: number;
  profileCompletenessAverage?: number | null;
  incompleteProfiles?: number;
}

const STATUS_STYLES = {
  attention: {
    card: 'border-orange-500/50 bg-orange-500/5 hover:border-orange-400 hover:bg-orange-500/10',
    iconWrapper: 'bg-orange-500/10 text-orange-400',
  },
  success: {
    card: 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-400 hover:bg-emerald-500/10',
    iconWrapper: 'bg-emerald-500/10 text-emerald-400',
  },
  neutral: {
    card: 'border-border/50 bg-background/80 hover:border-primary/40 hover:bg-primary/5',
    iconWrapper: 'bg-background/80 text-primary',
  },
};

const BADGE_STYLES = {
  attention: 'bg-orange-500 text-black shadow-orange-400/40',
  success: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
  neutral: 'bg-muted text-muted-foreground border border-border/40',
};

export function QuickActionsBar({
  pendingReviews,
  unansweredQuestions,
  totalLocations = 0,
  profileCompletenessAverage,
  incompleteProfiles = 0,
}: QuickActionsBarProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const safeProfileAverage = typeof profileCompletenessAverage === 'number'
    ? Math.max(0, Math.min(100, Math.round(profileCompletenessAverage)))
    : null;

  const hasLocations = totalLocations > 0;
  const needsProfileAttention = hasLocations && incompleteProfiles > 0;

  const quickActions: QuickAction[] = [];

  // Profile / Features action (new)
  if (!hasLocations) {
    quickActions.push({
      id: 'profile-connect',
      label: isArabic ? 'أضف موقعك الأول' : 'Connect your first location',
      icon: <Sparkles className="w-5 h-5" />, 
      description: isArabic
        ? 'أضف موقعاً لبدء تخصيص ملفك وإظهار الإحصاءات'
        : 'Add a location to unlock profile insights and quick actions.',
      href: '/locations',
      status: 'attention',
      badge: {
        text: isArabic ? 'ابدأ من هنا' : 'Start here',
        tone: 'attention',
        icon: <Zap className="w-3 h-3" />,
      },
    });
  } else if (needsProfileAttention) {
    const locationsLabel = `${incompleteProfiles}`;
    quickActions.push({
      id: 'profile',
      label: isArabic ? 'أكمل الملف التعريفي' : 'Complete business profile',
      icon: <Sparkles className="w-5 h-5" />, 
      description: isArabic
        ? `${locationsLabel} ${incompleteProfiles === 1 ? 'موقع يحتاج تحديثاً' : 'مواقع تحتاج تحديثاً'}`
        : `${incompleteProfiles} location${incompleteProfiles === 1 ? '' : 's'} need updates`,
      href: '/features',
      status: 'attention',
      badge: {
        text: safeProfileAverage !== null
          ? `${safeProfileAverage}%`
          : isArabic ? 'قيد الإعداد' : 'In progress',
        tone: 'attention',
        icon: <Zap className="w-3 h-3" />,
      },
    });
  } else {
    quickActions.push({
      id: 'profile-complete',
      label: isArabic ? 'الملف التعريفي جاهز' : 'Profile optimized',
      icon: <Sparkles className="w-5 h-5" />, 
      description: isArabic
        ? safeProfileAverage !== null
          ? `جميع المواقع مكتملة بنسبة ${safeProfileAverage}%`
          : 'جميع المواقع مكتملة'
        : safeProfileAverage !== null
        ? `All locations are ${safeProfileAverage}% complete`
        : 'All locations are fully complete.',
      href: '/features',
      status: 'success',
      badge: {
        text: safeProfileAverage !== null ? `${safeProfileAverage}%` : isArabic ? '✓ مكتمل' : 'All set',
        tone: 'success',
        icon: <CheckCircle2 className="w-3 h-3" />,
      },
    });
  }

  // Reviews action
  const hasPendingReviews = pendingReviews > 0;
  quickActions.push({
    id: 'reviews',
    label: hasPendingReviews
      ? (isArabic ? 'الرد على المراجعات' : 'Reply to reviews')
      : (isArabic ? 'لا مراجعات معلقة' : 'Reviews up to date'),
    icon: <MessageSquare className="w-5 h-5" />,
    description: hasPendingReviews
      ? (isArabic ? 'استجب للمراجعات المعلقة' : 'Respond to pending reviews')
      : (isArabic ? 'جميع المراجعات تمت الإجابة عليها' : 'All customer reviews have responses'),
    href: '/reviews',
    status: hasPendingReviews ? 'attention' : 'success',
    badge: hasPendingReviews
      ? {
          text: isArabic ? `${pendingReviews} بانتظار الرد` : `${pendingReviews} pending`,
          tone: 'attention',
          icon: <Zap className="w-3 h-3" />,
        }
      : {
          text: isArabic ? '✓ مكتمل' : 'All set',
          tone: 'success',
          icon: <CheckCircle2 className="w-3 h-3" />,
        },
  });

  // Questions action
  const hasPendingQuestions = unansweredQuestions > 0;
  quickActions.push({
    id: 'questions',
    label: hasPendingQuestions
      ? (isArabic ? 'الإجابة على الأسئلة' : 'Answer questions')
      : (isArabic ? 'لا أسئلة معلقة' : 'No pending questions'),
    icon: <HelpCircle className="w-5 h-5" />,
    description: hasPendingQuestions
      ? (isArabic ? 'رد على أسئلة العملاء بأسرع وقت' : 'Reply to customer questions sooner')
      : (isArabic ? 'كل الأسئلة تمت الإجابة عليها' : 'All customer questions are answered'),
    href: '/questions',
    status: hasPendingQuestions ? 'attention' : 'success',
    badge: hasPendingQuestions
      ? {
          text: isArabic ? `${unansweredQuestions} بحاجة لرد` : `${unansweredQuestions} pending`,
          tone: 'attention',
          icon: <Zap className="w-3 h-3" />,
        }
      : {
          text: isArabic ? '✓ مكتمل' : 'All set',
          tone: 'success',
          icon: <CheckCircle2 className="w-3 h-3" />,
        },
  });

  // Posts action (neutral, always available)
  quickActions.push({
    id: 'posts',
    label: isArabic ? 'أنشئ منشوراً جديداً' : 'Create new post',
    icon: <FileText className="w-5 h-5" />,
    description: isArabic
      ? 'شارك آخر العروض أو الأخبار مع عملائك'
      : 'Share updates, offers, or events with customers.',
    href: '/posts',
    status: 'neutral',
    badge: {
      text: isArabic ? 'خطوة سريعة' : 'Quick win',
      tone: 'neutral',
    },
  });

  return (
    <Card className="p-6 border border-primary/20 bg-background/80 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          {isArabic ? 'إجراءات سريعة' : 'Quick Actions'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isArabic ? 'أهم الإجراءات في مكان واحد' : 'Most common actions in one place'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const statusStyle = STATUS_STYLES[action.status];
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Link
                href={action.href}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                aria-label={`${action.label}. ${action.description}.`}
              >
                <Card
                  className={cn(
                    'group relative flex h-full flex-col justify-between gap-3 p-4 transition-all duration-300 cursor-pointer',
                    statusStyle.card,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg transition-transform group-hover:scale-105',
                          statusStyle.iconWrapper,
                        )}
                        aria-hidden="true"
                      >
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {action.label}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.description}
                        </p>
                        {action.badge && (
                          <div
                            className={cn(
                              'mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm',
                              BADGE_STYLES[action.badge.tone],
                            )}
                          >
                            {action.badge.icon ?? null}
                            {action.badge.text}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
