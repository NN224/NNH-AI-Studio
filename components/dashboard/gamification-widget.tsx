'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Flame, Star, Target, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GamificationWidgetProps {
  stats: {
    healthScore: number;
    responseRate: number;
    averageRating: number;
    totalReviews: number;
    pendingReviews: number;
  };
}

// Confetti animation component
function ConfettiEffect() {
  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            backgroundColor: ['#3b82f6', '#eab308', '#a855f7', '#10b981'][
              Math.floor(Math.random() * 4)
            ],
          }}
          initial={{ y: -10, opacity: 1 }}
          animate={{
            y: 400,
            opacity: 0,
            rotate: 360,
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export function GamificationWidget({ stats }: GamificationWidgetProps) {
  const responseGoal = 90;
  const healthGoal = 90;
  const ratingGoal = 4.5;
  const nextReviewsMilestone = Math.ceil(stats.totalReviews / 100) * 100 || 100;
  const reviewsProgress = Math.min(100, (stats.totalReviews / nextReviewsMilestone) * 100);

  // Track which targets have been reached
  const responseReached = stats.responseRate >= responseGoal;
  const healthReached = stats.healthScore >= healthGoal;
  const ratingReached = stats.averageRating >= ratingGoal;

  // Show confetti for newly reached targets
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('gamification_confetti_shown');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const anyTargetReached = responseReached || healthReached || ratingReached;
    const key = `${stats.responseRate}-${stats.healthScore}-${stats.averageRating}`;
    
    if (anyTargetReached && !hasShownConfetti[key]) {
      setShowConfetti(true);
      const newShown = { ...hasShownConfetti, [key]: true };
      setHasShownConfetti(newShown);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('gamification_confetti_shown', JSON.stringify(newShown));
      }

      // Hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [responseReached, healthReached, ratingReached]);

  const badges: { icon: React.ReactNode; label: string }[] = [];
  if (stats.averageRating >= 4.7) badges.push({ icon: <Star className="w-4 h-4 text-warning fill-warning" />, label: 'Golden Rating' });
  if (stats.responseRate >= 90) badges.push({ icon: <Flame className="w-4 h-4 text-primary" />, label: 'Reply Streak' });
  if (stats.healthScore >= 85) badges.push({ icon: <Trophy className="w-4 h-4 text-success" />, label: 'Excellent Health' });

  const ProgressItem = ({
    icon: Icon,
    label,
    current,
    target,
    isPercentage = true,
    isReached = false,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    current: number;
    target: number;
    isPercentage?: boolean;
    isReached?: boolean;
  }) => {
    const progress = Math.min(100, (current / target) * 100);
    const displayCurrent = isPercentage ? `${current.toFixed(0)}%` : current.toFixed(1);
    const displayTarget = isPercentage ? `${target}%` : target.toFixed(1);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                'w-4 h-4',
                isReached ? 'text-success' : 'text-primary'
              )}
            />
            <span className="font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Current: <span className="font-semibold">{displayCurrent}</span>
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-muted-foreground text-xs">
              Target: <span className="font-semibold">{displayTarget}</span>
            </span>
            {isReached && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Check className="w-4 h-4 text-success" />
              </motion.div>
            )}
          </div>
        </div>
        <div className={cn(
          'relative h-2 w-full overflow-hidden rounded-full',
          isReached ? 'bg-success/20' : 'bg-secondary'
        )}>
          <motion.div
            className={cn(
              'h-full transition-all',
              isReached ? 'bg-success' : 'bg-primary'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {isReached && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-success font-medium mt-1"
          >
            🎉 Target Reached!
          </motion.p>
        )}
      </motion.div>
    );
  };

  return (
    <Card className="border-2 border-primary/20 relative overflow-hidden">
      {showConfetti && <ConfettiEffect />}
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Achievements & Progress
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Track your goals and celebrate achievements
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {/* Response Rate Goal */}
        <ProgressItem
          icon={Flame}
          label="Response Rate"
          current={stats.responseRate}
          target={responseGoal}
          isPercentage={true}
          isReached={responseReached}
        />

        {/* Health Score Goal */}
        <ProgressItem
          icon={Target}
          label="Health Score"
          current={stats.healthScore}
          target={healthGoal}
          isPercentage={true}
          isReached={healthReached}
        />

        {/* Rating Goal */}
        <ProgressItem
          icon={Star}
          label="Average Rating"
          current={stats.averageRating}
          target={ratingGoal}
          isPercentage={false}
          isReached={ratingReached}
        />

        {/* Reviews milestone */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-warning" />
              <span className="font-medium">Reviews Milestone</span>
            </div>
            <span className="text-muted-foreground text-xs">
              {stats.totalReviews} / {nextReviewsMilestone}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full bg-primary transition-all"
              initial={{ width: 0 }}
              animate={{ width: `${reviewsProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 flex-wrap pt-2 border-t border-border"
          >
            {badges.map((b, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                className="px-2 py-1 text-xs rounded-full border bg-background flex items-center gap-1 shadow-sm"
              >
                {b.icon}
                <span>{b.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
