'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { answerQuestion, updateAnswer, deleteAnswer } from '@/server/actions/questions-management';
import type { GMBQuestion } from '@/lib/types/database';

interface AnswerDialogProps {
  question: GMBQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AnswerDialog({ question, isOpen, onClose, onSuccess }: AnswerDialogProps) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  // Update answer when question changes
  useEffect(() => {
    if (question) {
      setAnswer(question.answer_text || question.ai_suggested_answer || '');
    } else {
      setAnswer('');
    }
  }, [question]);

  const handleGenerateAI = async () => {
    if (!question) return;
    setGenerating(true);

    try {
      // Use new ML analysis endpoint
      const response = await fetch('/api/questions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          questionText: question.question_text || '',
          locationId: question.location_id,
          businessContext: {
            businessName: question.location_name || 'Business',
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate AI answer');
      }

      const { analysis } = await response.json();

      if (!analysis?.suggestedAnswer) {
        throw new Error('Invalid response from AI service');
      }

      setAnswer(analysis.suggestedAnswer);

      // Show confidence level
      const confidencePercent = Math.round((analysis.confidence || 0) * 100);
      toast.success(`AI answer generated with ${confidencePercent}% confidence!`, {
        description: `Category: ${analysis.category} | Intent: ${analysis.intent}`,
      });
    } catch (error) {
      console.error('Error generating AI answer:', error);
      toast.error('Failed to generate AI answer', {
        description: 'Please try again or write your own answer',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !answer.trim()) {
      toast.error('Please enter an answer');
      return;
    }

    if (answer.length > 2000) {
      toast.error('Answer is too long. Maximum 2000 characters.');
      return;
    }

    setLoading(true);

    try {
      let result;

      // Check if question already has an answer (update) or is new (create)
      if (question.answer_status === 'answered' && question.answer_text) {
        result = await updateAnswer(question.id, answer.trim());
      } else {
        result = await answerQuestion(question.id, answer.trim());
      }

      if (result.success) {
        toast.success(result.message || 'Answer posted successfully!', {
          description: 'Your answer is now visible on Google',
        });
        setAnswer('');
        onClose();
        onSuccess?.();
        router.refresh();
      } else {
        toast.error('Failed to post answer', {
          description: result.error,
          action: result.error?.includes('reconnect') || result.error?.includes('Authentication')
            ? {
                label: 'Settings',
                onClick: () => router.push('/settings'),
              }
            : undefined,
        });
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error('An unexpected error occurred', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!question || !question.answer_text) return;

    if (!confirm('Are you sure you want to delete this answer?')) {
      return;
    }

    setLoading(true);

    try {
      const result = await deleteAnswer(question.id);

      if (result.success) {
        toast.success('Answer deleted!');
        setAnswer('');
        onClose();
        onSuccess?.();
        router.refresh();
      } else {
        toast.error('Failed to delete answer', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error deleting answer:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!question) return null;

  const isAnswered = question.answer_status === 'answered' && question.answer_text;
  const characterCount = answer.length;
  const maxCharacters = 2000;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {isAnswered ? 'Edit Answer' : 'Answer Question'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isAnswered
              ? 'Update your answer to this customer question'
              : 'Provide a helpful answer to this customer question'}
          </DialogDescription>
        </DialogHeader>

        {/* Question Details */}
        <div className="space-y-4">
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
            <div className="text-xs text-zinc-400 mb-2">Question:</div>
            <p className="text-sm text-zinc-200">{question.question_text}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
              <span>👤 {question.author_name || question.author_display_name || 'Anonymous'}</span>
              {question.upvote_count && question.upvote_count > 0 && (
                <span>👍 {question.upvote_count} upvotes</span>
              )}
              {question.location_name && (
                <span>📍 {question.location_name}</span>
              )}
            </div>
          </div>

          {/* AI Suggested Answer (if available and not answered) */}
          {question.ai_suggested_answer && !isAnswered && (
            <div className="bg-orange-950/30 border border-orange-500/30 rounded-lg p-4">
              <div className="text-sm text-orange-400 mb-2 flex items-center gap-2">
                <Sparkles size={16} />
                <span className="font-medium">AI Suggested Answer</span>
                {question.ai_confidence_score && (
                  <span className="text-xs bg-orange-500/20 px-2 py-0.5 rounded">
                    {Math.round(question.ai_confidence_score * 100)}% confidence
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-300 mb-3">{question.ai_suggested_answer}</p>
              <Button
                onClick={() => setAnswer(question.ai_suggested_answer || '')}
                size="sm"
                variant="outline"
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                Use This Answer
              </Button>
            </div>
          )}

          {/* Answer Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Your Answer {isAnswered && '(Editing)'}
            </label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here... Be helpful, professional, and concise."
              rows={6}
              maxLength={maxCharacters}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-orange-500 resize-none"
            />
            <div className="flex items-center justify-between text-xs">
              <span className={`${characterCount > maxCharacters ? 'text-red-400' : 'text-zinc-500'}`}>
                {characterCount} / {maxCharacters} characters
              </span>
              {!isAnswered && (
                <Button
                  onClick={handleGenerateAI}
                  disabled={generating}
                  variant="outline"
                  size="sm"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-2" />
                      Generate AI Answer
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {isAnswered && (
              <Button
                onClick={handleDelete}
                disabled={loading}
                variant="destructive"
                size="sm"
                className="mr-2"
              >
                Delete Answer
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !answer.trim() || answer.length > maxCharacters}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isAnswered ? 'Updating...' : 'Posting...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isAnswered ? 'Update Answer' : 'Post Answer'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

