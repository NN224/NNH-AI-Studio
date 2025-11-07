'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, MapPin, Clock, Edit2, Trash2 } from 'lucide-react';
import type { GMBQuestion } from '@/lib/types/database';

type QuestionType = GMBQuestion & { 
  location_name?: string;
  gmb_locations?: { location_name?: string };
};

interface QuestionCardProps {
  question: QuestionType;
  isSelected?: boolean;
  onClick?: () => void;
  onAnswer?: () => void;
}

export function QuestionCard({ question, isSelected, onClick, onAnswer }: QuestionCardProps) {
  const needsAnswer = !question.answer_text && (question.answer_status === 'unanswered' || question.answer_status === 'pending');
  const isAnswered = question.answer_status === 'answered' && question.answer_text;

  return (
    <Card
      onClick={onClick}
      className={`
        border-l-4 transition-all cursor-pointer
        ${isSelected 
          ? 'bg-orange-500/10 border-l-orange-500 ring-2 ring-orange-500/50' 
          : needsAnswer
            ? 'bg-orange-950/20 border-l-orange-500 hover:bg-orange-950/30'
            : 'bg-zinc-800/50 border-l-green-500 hover:bg-zinc-800'
        }
      `}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-bold flex-shrink-0">
              {question.author_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">
                {question.author_name || question.author_display_name || 'Anonymous'}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <MapPin size={12} />
                <span className="truncate">{question.location_name || question.gmb_locations?.location_name || 'Unknown Location'}</span>
                <Clock size={12} className="ml-2" />
                <span 
                  title={question.asked_at || question.created_at ? new Date(question.asked_at || question.created_at || '').toLocaleString() : 'Unknown date'}
                  className="cursor-help"
                >
                  {formatTimeAgo(question.asked_at || question.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {needsAnswer ? (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                Needs Answer
              </Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                <MessageSquare size={12} />
                Answered
              </Badge>
            )}
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-3">
          <p className="text-sm text-gray-300 line-clamp-3">
            {question.question_text}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Upvotes */}
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            {question.upvote_count && question.upvote_count > 0 && (
              <div className="flex items-center gap-1">
                <ThumbsUp size={14} />
                <span>{question.upvote_count} upvotes</span>
              </div>
            )}
            {question.priority && (
              <Badge 
                className={`text-xs ${
                  question.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  question.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                  question.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}
              >
                {question.priority.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          {onAnswer && (
            <Button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onAnswer();
              }}
              className={`text-xs font-medium transition-colors ${
                needsAnswer
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
              size="sm"
            >
              {needsAnswer ? '💬 Answer' : '✏️ Edit Answer'}
            </Button>
          )}
        </div>

        {/* Answer Preview (if exists) */}
        {isAnswered && question.answer_text && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="text-xs text-zinc-400 mb-1">Your Answer:</div>
            <p className="text-sm text-zinc-300 line-clamp-2">
              {question.answer_text}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date: string | undefined | null): string {
  if (!date) {
    return 'Unknown';
  }
  
  try {
    const now = new Date();
    let questionDate: Date;
    
    // Check if date has timezone info
    const hasTimezone = date.includes('Z') || 
                       /[+-]\d{2}:\d{2}$/.test(date) || 
                       /[+-]\d{4}$/.test(date);
    
    if (hasTimezone) {
      questionDate = new Date(date);
    } else {
      questionDate = new Date(date + 'Z');
    }
    
    if (isNaN(questionDate.getTime())) {
      return 'Unknown';
    }
    
    const diffMs = now.getTime() - questionDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Recently';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  } catch (error) {
    console.error('[formatTimeAgo] Date formatting error:', error, date);
    return 'Unknown';
  }
}

