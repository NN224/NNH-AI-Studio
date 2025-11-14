import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { GMBQuestion } from '@/lib/types/database';

/**
 * Question filters type
 */
interface QuestionFilters {
  locationId?: string;
  status?: 'unanswered' | 'answered' | 'all';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'most_upvoted' | 'urgent';
}

/**
 * Question statistics
 */
interface QuestionStats {
  total: number;
  answered: number;
  unanswered: number;
  answerRate: number;
  avgResponseTime: number; // in hours
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Questions state type
 */
interface QuestionsState {
  // Questions data
  questions: GMBQuestion[];
  questionsLoading: boolean;
  questionsError: Error | null;
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
  
  // Filters
  filters: QuestionFilters;
  
  // Statistics
  stats: QuestionStats;
  statsLoading: boolean;
  
  // Selected question
  selectedQuestion: GMBQuestion | null;
  
  // Auto-answer status
  autoAnswerEnabled: boolean;
  autoAnswerLoading: boolean;
  
  // Knowledge base
  knowledgeBase: Array<{ id: string; question: string; answer: string }>;
  
  // AI suggestions
  aiSuggestion: string | null;
  aiSuggestionLoading: boolean;
  
  // Actions
  setQuestions: (questions: GMBQuestion[], append?: boolean) => void;
  setQuestionsLoading: (loading: boolean) => void;
  setQuestionsError: (error: Error | null) => void;
  setTotalCount: (count: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<QuestionFilters>) => void;
  resetFilters: () => void;
  setStats: (stats: Partial<QuestionStats>) => void;
  setStatsLoading: (loading: boolean) => void;
  setSelectedQuestion: (question: GMBQuestion | null) => void;
  setAutoAnswerEnabled: (enabled: boolean) => void;
  setAutoAnswerLoading: (loading: boolean) => void;
  setKnowledgeBase: (kb: Array<{ id: string; question: string; answer: string }>) => void;
  setAISuggestion: (suggestion: string | null) => void;
  setAISuggestionLoading: (loading: boolean) => void;
  updateQuestion: (questionId: string, updates: Partial<GMBQuestion>) => void;
  
  // Computed values
  getQuestionById: (id: string) => GMBQuestion | undefined;
  getUnansweredQuestions: () => GMBQuestion[];
  getUrgentQuestions: () => GMBQuestion[];
  
  // Fetch functions
  fetchQuestions: (append?: boolean) => Promise<void>;
  fetchQuestionStats: () => Promise<void>;
  fetchKnowledgeBase: () => Promise<void>;
  answerQuestion: (questionId: string, answer: string) => Promise<boolean>;
  generateAIAnswer: (questionId: string) => Promise<string | null>;
  loadMore: () => Promise<void>;
}

/**
 * Questions store implementation
 */
export const useQuestionsStore = create<QuestionsState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        questions: [],
        questionsLoading: false,
        questionsError: null,
        totalCount: 0,
        hasMore: true,
        page: 1,
        pageSize: 20,
        filters: {},
        stats: {
          total: 0,
          answered: 0,
          unanswered: 0,
          answerRate: 0,
          avgResponseTime: 0,
          priorityBreakdown: {
            urgent: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
        },
        statsLoading: false,
        selectedQuestion: null,
        autoAnswerEnabled: false,
        autoAnswerLoading: false,
        knowledgeBase: [],
        aiSuggestion: null,
        aiSuggestionLoading: false,
        
        // Actions
        setQuestions: (questions, append = false) =>
          set((state) => {
            if (append) {
              state.questions = [...state.questions, ...questions];
            } else {
              state.questions = questions;
            }
          }),
          
        setQuestionsLoading: (loading) =>
          set((state) => {
            state.questionsLoading = loading;
          }),
          
        setQuestionsError: (error) =>
          set((state) => {
            state.questionsError = error;
          }),
          
        setTotalCount: (count) =>
          set((state) => {
            state.totalCount = count;
          }),
          
        setHasMore: (hasMore) =>
          set((state) => {
            state.hasMore = hasMore;
          }),
          
        setPage: (page) =>
          set((state) => {
            state.page = page;
          }),
          
        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.page = 1; // Reset page when filters change
          }),
          
        resetFilters: () =>
          set((state) => {
            state.filters = {};
            state.page = 1;
          }),
          
        setStats: (stats) =>
          set((state) => {
            Object.assign(state.stats, stats);
          }),
          
        setStatsLoading: (loading) =>
          set((state) => {
            state.statsLoading = loading;
          }),
          
        setSelectedQuestion: (question) =>
          set((state) => {
            state.selectedQuestion = question;
          }),
          
        setAutoAnswerEnabled: (enabled) =>
          set((state) => {
            state.autoAnswerEnabled = enabled;
          }),
          
        setAutoAnswerLoading: (loading) =>
          set((state) => {
            state.autoAnswerLoading = loading;
          }),
          
        setKnowledgeBase: (kb) =>
          set((state) => {
            state.knowledgeBase = kb;
          }),
          
        setAISuggestion: (suggestion) =>
          set((state) => {
            state.aiSuggestion = suggestion;
          }),
          
        setAISuggestionLoading: (loading) =>
          set((state) => {
            state.aiSuggestionLoading = loading;
          }),
          
        updateQuestion: (questionId, updates) =>
          set((state) => {
            const index = state.questions.findIndex((q) => q.id === questionId);
            if (index !== -1) {
              Object.assign(state.questions[index], updates);
            }
            if (state.selectedQuestion?.id === questionId) {
              Object.assign(state.selectedQuestion, updates);
            }
          }),
          
        // Computed values
        getQuestionById: (id) => {
          return get().questions.find((q) => q.id === id);
        },
        
        getUnansweredQuestions: () => {
          return get().questions.filter(
            (q) => q.answer_status === 'unanswered' || q.answer_status === 'pending'
          );
        },
        
        getUrgentQuestions: () => {
          return get().questions.filter((q) => q.priority === 'urgent');
        },
        
        // Fetch functions
        fetchQuestions: async (append = false) => {
          const state = get();
          
          set((state) => {
            state.questionsLoading = true;
            state.questionsError = null;
          });
          
          try {
            const params = new URLSearchParams({
              page: state.page.toString(),
              pageSize: state.pageSize.toString(),
              ...Object.fromEntries(
                Object.entries(state.filters).filter(([_, v]) => v != null)
              ),
            });
            
            const response = await fetch(`/api/gmb/questions?${params}`);
            if (!response.ok) {
              throw new Error('Failed to fetch questions');
            }
            
            const data = await response.json();
            
            set((state) => {
              state.setQuestions(data.questions || [], append);
              state.totalCount = data.total || 0;
              state.hasMore = data.hasMore ?? (data.questions?.length === state.pageSize);
              state.questionsLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.questionsError = error instanceof Error ? error : new Error('Unknown error');
              state.questionsLoading = false;
            });
          }
        },
        
        fetchQuestionStats: async () => {
          set((state) => {
            state.statsLoading = true;
          });
          
          try {
            const response = await fetch('/api/questions/stats');
            if (!response.ok) {
              throw new Error('Failed to fetch question stats');
            }
            
            const data = await response.json();
            
            set((state) => {
              state.stats = {
                total: data.total || 0,
                answered: data.answered || 0,
                unanswered: data.unanswered || 0,
                answerRate: data.answerRate || 0,
                avgResponseTime: data.avgResponseTime || 0,
                priorityBreakdown: data.priorityBreakdown || {
                  urgent: 0,
                  high: 0,
                  medium: 0,
                  low: 0,
                },
              };
              state.statsLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.statsLoading = false;
            });
          }
        },
        
        fetchKnowledgeBase: async () => {
          try {
            const response = await fetch('/api/knowledge-base');
            if (!response.ok) {
              throw new Error('Failed to fetch knowledge base');
            }
            
            const data = await response.json();
            
            set((state) => {
              state.knowledgeBase = data.items || [];
            });
          } catch (error) {
            console.error('Knowledge base fetch error:', error);
          }
        },
        
        answerQuestion: async (questionId, answer) => {
          try {
            const response = await fetch(`/api/gmb/questions/${questionId}/answer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ answer_text: answer }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to post answer');
            }
            
            // Update local state
            get().updateQuestion(questionId, {
              answer_text: answer,
              answer_status: 'answered',
              answered_at: new Date().toISOString(),
            });
            
            return true;
          } catch (error) {
            console.error('Answer error:', error);
            return false;
          }
        },
        
        generateAIAnswer: async (questionId) => {
          const question = get().getQuestionById(questionId);
          if (!question) return null;
          
          set((state) => {
            state.aiSuggestionLoading = true;
          });
          
          try {
            const response = await fetch('/api/ai/generate-review-reply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reviewText: question.question_text || '',
                rating: 5,
                tone: 'friendly',
                locationName: question.location_name || 'Business',
                isQuestion: true,
              }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to generate AI answer');
            }
            
            const data = await response.json();
            const suggestion = data.reply || null;
            
            set((state) => {
              state.aiSuggestion = suggestion;
              state.aiSuggestionLoading = false;
            });
            
            return suggestion;
          } catch (error) {
            console.error('AI generation error:', error);
            set((state) => {
              state.aiSuggestionLoading = false;
            });
            return null;
          }
        },
        
        loadMore: async () => {
          const state = get();
          if (!state.hasMore || state.questionsLoading) return;
          
          set((state) => {
            state.page = state.page + 1;
          });
          
          await get().fetchQuestions(true);
        },
      }))
    ),
    {
      name: 'QuestionsStore',
    }
  )
);

/**
 * Selectors for common use cases
 */
export const selectQuestionStats = (state: QuestionsState) => state.stats;
export const selectUnansweredQuestions = (state: QuestionsState) => 
  state.questions.filter(q => q.answer_status === 'unanswered' || q.answer_status === 'pending');
export const selectQuestionFilters = (state: QuestionsState) => state.filters;
export const selectSelectedQuestion = (state: QuestionsState) => state.selectedQuestion;
