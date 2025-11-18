'use client';

import { motion } from 'framer-motion';
import { Sparkles, Rocket } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function BetaBadge({ 
  size = 'sm',
  variant = 'positive' 
}: { 
  size?: 'xs' | 'sm' | 'md';
  variant?: 'positive' | 'warning';
}) {
  const sizeClasses = {
    xs: 'text-[9px] px-1 py-0.5',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  };

  // Positive = تطوير نشط (أخضر زمردي)
  // Warning = تحت الاختبار (برتقالي)
  const colors = variant === 'positive' 
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : 'bg-orange-500/20 text-orange-400 border-orange-500/30';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
              inline-flex items-center gap-1 rounded
              font-bold border cursor-default
              ${colors}
              ${sizeClasses[size]}
            `}
          >
            <Sparkles className="h-2.5 w-2.5" />
            BETA
          </motion.span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-800 max-w-xs">
          <div className="space-y-1.5">
            <p className="text-xs font-bold flex items-center gap-1.5">
              <Rocket className="h-3.5 w-3.5 text-emerald-400" />
              Active Development
            </p>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              We're actively building new features based on your feedback. 
              Expect frequent updates and improvements! 🚀
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BetaIndicator() {
  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm border-b border-emerald-500/20 px-4 py-1"
    >
      <Sparkles className="h-3 w-3 text-emerald-400" />
      <span className="text-[11px] font-medium text-emerald-400">
        BETA - New features weekly
      </span>
      <a 
        href="mailto:feedback@nnh.ae" 
        className="text-[10px] text-blue-400 hover:text-blue-300 underline ml-1 transition-colors"
      >
        Share feedback
      </a>
    </motion.div>
  );
}

