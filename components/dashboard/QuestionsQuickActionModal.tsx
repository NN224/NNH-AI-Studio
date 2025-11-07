'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { answerQuestion } from '@/server/actions/gmb-questions';
import { useRouter } from 'next/navigation';

export interface QuestionItem {
  id: string;
  question_text: string;
  created_at: string;
  author_name?: string | null;
  upvote_count?: number | null;
  upvotes?: number | null;
  answer_status?: string | null;
}

interface QuestionsQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  unansweredQuestions: QuestionItem[];
  onSuccess?: () => void;
}

export function QuestionsQuickActionModal({
  isOpen,
  onClose,
  unansweredQuestions,
  onSuccess,
}: QuestionsQuickActionModalProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handlePostAnswer = async () => {
    if (!selectedQuestion || answerText.trim().length === 0) {
      toast.error('Please enter an answer.');
      return;
    }

    if (answerText.length > 1500) {
      toast.error('Answer is too long. Maximum 1500 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await answerQuestion(selectedQuestion.id, answerText.trim());

      if (result.success) {
        toast.success('Answer posted successfully!', {
          description: 'Your answer is now visible on Google',
        });
    setAnswerText('');
    setSelectedQuestion(null);
        onSuccess?.();
        router.refresh();
    onClose();
      } else {
        toast.error('Failed to post answer', {
          description: result.error || 'Please try again',
          action: result.error?.includes('reconnect')
            ? {
                label: 'Settings',
                onClick: () => router.push('/settings'),
              }
            : undefined,
        });
      }
    } catch (error: any) {
      console.error('Error posting answer:', error);
      toast.error('An unexpected error occurred', {
        description: 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAndReset = () => {
    setSelectedQuestion(null);
    setAnswerText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeAndReset() : null)}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Answer Questions</DialogTitle>
          <DialogDescription className="text-zinc-400">
            View unanswered customer questions and post a helpful answer.
          </DialogDescription>
        </DialogHeader>

        {!selectedQuestion ? (
          <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
            {unansweredQuestions.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">No unanswered questions 🎉</div>
            ) : (
              unansweredQuestions.map((q) => (
                <Card
                  key={q.id}
                  className="bg-zinc-800/50 border-zinc-700/50 hover:border-orange-500/40 transition-all cursor-pointer"
                  onClick={() => setSelectedQuestion(q)}
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-300">{q.author_name || 'Customer'}</p>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        Unanswered
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-200 line-clamp-3">{q.question_text}</p>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{new Date(q.created_at).toLocaleString()}</span>
                      {(typeof q.upvotes === 'number' || typeof q.upvote_count === 'number') && (
                        <span>▲ {q.upvotes || q.upvote_count || 0}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <p className="text-sm text-zinc-200">{selectedQuestion.question_text}</p>
              <p className="text-xs text-zinc-500 mt-2">
                {new Date(selectedQuestion.created_at).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-300">Your Answer</label>
                <span className={`text-xs ${answerText.length > 1500 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {answerText.length} / 1500
                </span>
              </div>
              <Textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[120px]"
                maxLength={1600}
              />
              {answerText.length > 1500 && (
                <p className="text-xs text-red-400">Answer exceeds the 1500 character limit</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedQuestion(null)}
                className="text-zinc-300 hover:text-zinc-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePostAnswer}
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSubmitting ? 'Posting...' : 'Post Answer'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


