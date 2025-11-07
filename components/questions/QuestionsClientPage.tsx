'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  answerQuestion,
  updateAnswer,
  deleteAnswer,
  syncQuestionsFromGoogle,
} from '@/server/actions/questions-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Bot } from 'lucide-react';
import { QuestionCard } from './question-card';
import { AnswerDialog } from './answer-dialog';
import { AIAssistantSidebar } from './ai-assistant-sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface QuestionStats {
  total: number;
  unanswered: number;
  answered: number;
  totalUpvotes: number;
  avgUpvotes: number;
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  answerRate: number;
}

interface QuestionsClientPageProps {
  initialQuestions: any[];
  stats: QuestionStats | null;
  totalCount: number;
  locations: Array<{ id: string; location_name: string }>;
  currentFilters: {
    locationId?: string;
    status?: string;
    priority?: string;
    searchQuery?: string;
    page?: number;
    sortBy?: string;
  };
}

export function QuestionsClientPage({
  initialQuestions,
  stats,
  totalCount,
  locations,
  currentFilters,
}: QuestionsClientPageProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Update filter in URL
  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset to page 1 when filters change
    if (key !== 'page') {
      params.set('page', '1');
    }

    router.push(`/questions?${params.toString()}`);
  };

  // Handle sync
  const handleSync = async () => {
    if (!currentFilters.locationId) {
      toast.error('Please select a location first');
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncQuestionsFromGoogle(currentFilters.locationId);

      if (result.success) {
        toast.success('Questions synced!', {
          description: result.message,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error('Sync failed', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle answer
  const handleAnswer = (question: any) => {
    setSelectedQuestion(question);
    setAnswerDialogOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / 50);
  const currentPage = currentFilters.page || 1;

  return (
    <div className="flex flex-col h-full bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 border-b border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Questions & Answers</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage, analyze, and answer customer questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile AI Assistant Button */}
          <Button
            onClick={() => setAiSidebarOpen(true)}
            variant="outline"
            className="lg:hidden border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
          <Button
            onClick={handleSync}
            disabled={isSyncing || !currentFilters.locationId}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Questions'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Total Questions</p>
                <p className="text-3xl font-bold text-zinc-100">{stats.total || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Unanswered</p>
                <p className="text-3xl font-bold text-orange-400">{stats.unanswered || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Answered</p>
                <p className="text-3xl font-bold text-green-400">{stats.answered || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Answer Rate</p>
                <p className={`text-3xl font-bold ${stats.answerRate < 50 ? 'text-red-400' : 'text-green-400'}`}>
                  {stats.answerRate?.toFixed(1) || '0'}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-6">
                <p className="text-zinc-400 text-sm mb-2">Total Upvotes</p>
                <p className="text-3xl font-bold text-zinc-100">{stats.totalUpvotes || 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Location Filter */}
          <select
            value={currentFilters.locationId || ''}
            onChange={(e) => updateFilter('location', e.target.value || null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={currentFilters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="unanswered">Unanswered</option>
            <option value="answered">Answered</option>
          </select>

          {/* Priority Filter */}
          <select
            value={currentFilters.priority || ''}
            onChange={(e) => updateFilter('priority', e.target.value || null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort By */}
          <select
            value={currentFilters.sortBy || 'newest'}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-orange-500 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_upvoted">Most Upvoted</option>
            <option value="urgent">Priority</option>
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search questions..."
              defaultValue={currentFilters.searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                const timeoutId = setTimeout(() => {
                  updateFilter('search', value || null);
                }, 500);
                return () => clearTimeout(timeoutId);
              }}
              className="pl-10 bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-orange-500"
            />
          </div>

          {/* Clear Filters */}
          {(currentFilters.locationId ||
            currentFilters.status ||
            currentFilters.priority ||
            currentFilters.searchQuery) && (
            <Button
              variant="ghost"
              onClick={() => router.push('/questions')}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Questions List - Left Side */}
        <div className="flex-1 overflow-auto">
          {isPending && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          )}

          {!isPending && initialQuestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-lg mb-2">No questions found</p>
              <p className="text-zinc-600 text-sm">
                {currentFilters.locationId
                  ? 'Try syncing questions or adjusting filters'
                  : 'Select a location to view questions'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {initialQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onClick={() => setSelectedQuestion(question)}
                  isSelected={selectedQuestion?.id === question.id}
                  onAnswer={() => handleAnswer(question)}
                />
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant Sidebar - Right Side */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <div className="sticky top-6 h-[calc(100vh-8rem)]">
            <AIAssistantSidebar
              selectedQuestion={selectedQuestion}
              pendingQuestionsCount={stats?.unanswered || 0}
              locationId={currentFilters.locationId}
            />
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-zinc-800">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => updateFilter('page', (currentPage - 1).toString())}
              className="border-zinc-700 text-zinc-300"
            >
              Previous
            </Button>

            <span className="text-zinc-400 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => updateFilter('page', (currentPage + 1).toString())}
              className="border-zinc-700 text-zinc-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Answer Dialog */}
      <AnswerDialog
        question={selectedQuestion}
        isOpen={answerDialogOpen}
        onClose={() => {
          setAnswerDialogOpen(false);
          setSelectedQuestion(null);
        }}
        onSuccess={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />

      {/* Mobile AI Assistant Sheet */}
      <Sheet open={aiSidebarOpen} onOpenChange={setAiSidebarOpen}>
        <SheetContent side="right" className="w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 p-0 overflow-y-auto">
          <SheetHeader className="p-6 border-b border-zinc-800">
            <SheetTitle className="text-white">AI Assistant</SheetTitle>
          </SheetHeader>
          <div className="p-6">
            <AIAssistantSidebar
              selectedQuestion={selectedQuestion}
              pendingQuestionsCount={stats?.unanswered || 0}
              locationId={currentFilters.locationId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

