'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/navigation';
import { 
  MessageSquare, 
  HelpCircle, 
  FileText, 
  RefreshCw,
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface QuickAction {
  id: string;
  label: string;
  labelAr: string;
  icon: React.ReactNode;
  count?: number;
  href: string;
  color: string;
  gradient: string;
  description: string;
  descriptionAr: string;
}

interface QuickActionsBarProps {
  pendingReviews: number;
  unansweredQuestions: number;
  onSync?: () => void;
  isSyncing?: boolean;
  locale?: string;
}

export function QuickActionsBar({ 
  pendingReviews, 
  unansweredQuestions,
  onSync,
  isSyncing = false,
  locale = 'en'
}: QuickActionsBarProps) {
  const isArabic = locale === 'ar';

  const quickActions: QuickAction[] = [
    {
      id: 'reviews',
      label: 'Reply to Reviews',
      labelAr: 'الرد على المراجعات',
      icon: <MessageSquare className="w-5 h-5" />,
      count: pendingReviews,
      href: '/reviews',
      color: 'text-blue-600',
      gradient: 'from-blue-500/10 to-blue-600/5',
      description: 'Respond to pending reviews',
      descriptionAr: 'الرد على المراجعات المعلقة'
    },
    {
      id: 'questions',
      label: 'Answer Questions',
      labelAr: 'الإجابة على الأسئلة',
      icon: <HelpCircle className="w-5 h-5" />,
      count: unansweredQuestions,
      href: '/questions',
      color: 'text-purple-600',
      gradient: 'from-purple-500/10 to-purple-600/5',
      description: 'Reply to customer questions',
      descriptionAr: 'الرد على أسئلة العملاء'
    },
    {
      id: 'posts',
      label: 'Create New Post',
      labelAr: 'إنشاء منشور جديد',
      icon: <FileText className="w-5 h-5" />,
      href: '/gmb-posts',
      color: 'text-green-600',
      gradient: 'from-green-500/10 to-green-600/5',
      description: 'Share updates with customers',
      descriptionAr: 'مشاركة التحديثات مع العملاء'
    }
  ];

  return (
    <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {isArabic ? 'إجراءات سريعة' : 'Quick Actions'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isArabic 
              ? 'الإجراءات الأكثر شيوعاً في مكان واحد' 
              : 'Most common actions in one place'}
          </p>
        </div>
        
        {onSync && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            {isArabic ? 'مزامنة الكل' : 'Sync All'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={action.href}>
              <Card className={cn(
                "p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group",
                "border-2 border-transparent hover:border-primary/30",
                `bg-gradient-to-br ${action.gradient}`
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-background/80 group-hover:scale-110 transition-transform",
                      action.color
                    )}>
                      {action.icon}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {isArabic ? action.labelAr : action.label}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isArabic ? action.descriptionAr : action.description}
                      </p>
                      
                      {action.count !== undefined && action.count > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/30">
                          <Zap className="w-3 h-3 fill-white" />
                          {action.count} {isArabic ? 'معلق' : 'pending'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ArrowRight className={cn(
                    "w-4 h-4 text-muted-foreground group-hover:text-primary",
                    "group-hover:translate-x-1 transition-all",
                    isArabic && "rotate-180"
                  )} />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
