import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RefreshCw, 
  Clock, 
  Calendar, 
  MapPin, 
  Star, 
  Zap, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings
} from 'lucide-react';
import {
  RefreshButton,
  SyncAllButton,
  TimeFilterButtons,
  LastUpdated,
} from './DashboardClient';
import Link from 'next/link';
import { RefreshOnEvent } from './RefreshOnEvent';
import { MetricsPanel } from '@/components/analytics/metrics-panel';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';

// TypeScript Interfaces
interface DashboardStats {
  totalLocations: number;
  totalReviews: number;
  avgRating: string;
  responseRate: string;
  healthScore: number;
  pendingReviews: number;
  pendingQuestions: number;
}

interface Location {
  id: string;
  location_id?: string | null;
  normalized_location_id?: string | null;
  location_name: string;
  rating: number | null;
  review_count: number | null;
  response_rate: number | null;
  is_active: boolean | null;
  address: string | null;
  category: string | null;
  updated_at?: string | null;
}

interface Review {
  id: string;
    rating: number;
  comment: string | null;
  review_reply: string | null;
  status: string | null;
  ai_sentiment: string | null;
  created_at: string;
}

interface Question {
  id: string;
  question_text: string;
  answer_text: string | null;
  answer_status: string | null;
  created_at: string;
}

// Data Fetching Function
async function getDashboardData(startDate?: string, endDate?: string) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        reviews: [] as Review[],
        locations: [] as Location[],
        questions: [] as Question[],
        accountId: null as string | null,
      };
    }
    
    // Build reviews query with optional date filtering
    let reviewsQuery = supabase
      .from('gmb_reviews')
      .select('*')
      .eq('user_id', user.id);
    
    // Apply date filtering if provided
    // Filter by review_date primarily, with created_at as fallback for records without review_date
    if (startDate && endDate) {
      // Filter records where review_date is in range OR (review_date is null AND created_at is in range)
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      const endDateStr = endDatePlusOne.toISOString().split('T')[0];
      // Use created_at as the main filter since it's always present
      reviewsQuery = reviewsQuery
        .gte('created_at', startDate)
        .lt('created_at', endDateStr);
    } else if (startDate) {
      reviewsQuery = reviewsQuery.gte('created_at', startDate);
    } else if (endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      const endDateStr = endDatePlusOne.toISOString().split('T')[0];
      reviewsQuery = reviewsQuery.lt('created_at', endDateStr);
    }
    
    const { data: reviews, error: reviewsError } = await reviewsQuery
      .order('review_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    if (reviewsError) {
      // Silently handle error, return empty array
    }
    
    // Fetch locations for current user
    const { data: locationRows, error: locationsError } = await supabase
      .from('gmb_locations')
      .select('*')
      .eq('user_id', user.id)
      .in('is_active', [true, false]);
    
    if (locationsError) {
      // Silently handle error, return empty array
    }
    
    // Build questions query with optional date filtering
    let questionsQuery = supabase
      .from('gmb_questions')
      .select('*')
      .eq('user_id', user.id);
    
    // Apply date filtering if provided
    if (startDate) {
      questionsQuery = questionsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      questionsQuery = questionsQuery.lt('created_at', endDatePlusOne.toISOString().split('T')[0]);
    }
    
    const { data: questions, error: questionsError } = await questionsQuery
      .order('created_at', { ascending: false });
    
    if (questionsError) {
      // Silently handle error, return empty array
    }
    
    // Fetch primary GMB account id (first active)
    let accountId: string | null = null;
    try {
      const { data: accountRow } = await supabase
        .from('gmb_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_sync', { ascending: false })
        .limit(1)
        .maybeSingle();
      accountId = accountRow?.id || null;
    } catch {}

    const locations = deduplicateAndSortLocations((locationRows || []) as Location[]);

    return {
      reviews: (reviews || []) as Review[],
      locations,
      questions: (questions || []) as Question[],
      accountId,
    };
  } catch (error) {
    return {
      reviews: [] as Review[],
      locations: [] as Location[],
      questions: [] as Question[],
      accountId: null as string | null,
    };
  }
}

// Stats Calculation Helper Functions
function calculateAverageRating(reviews: Review[]): string {
  if (!reviews || reviews.length === 0) return '0.0';
  const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
  return (sum / reviews.length).toFixed(1);
}

function calculateResponseRate(reviews: Review[]): string {
  if (!reviews || reviews.length === 0) return '0.0';
  const replied = reviews.filter(r => r.review_reply && r.review_reply.trim() !== '').length;
  return ((replied / reviews.length) * 100).toFixed(1);
}

function calculateHealthScore(stats: {
  avgRating: string;
  responseRate: string;
  totalReviews: number;
}): number {
  // Health score formula:
  // 40% based on rating (out of 5)
  // 50% based on response rate (out of 100)
  // 10% based on having reviews
  
  const ratingScore = (parseFloat(stats.avgRating) / 5) * 40;
  const responseScore = (parseFloat(stats.responseRate) / 100) * 50;
  const reviewsScore = stats.totalReviews > 0 ? 10 : 0;
  
  return Math.round(ratingScore + responseScore + reviewsScore);
}

function getPendingReviews(reviews: Review[]): number {
  return reviews.filter(r => !r.review_reply || r.review_reply.trim() === '').length;
}

function getPendingQuestions(questions: Question[]): number {
  return questions.filter(q => !q.answer_text || q.answer_text.trim() === '' || q.answer_status === 'pending').length;
}

function deduplicateAndSortLocations(rawLocations: Location[]): Location[] {
  if (!rawLocations || rawLocations.length === 0) {
    return [];
  }

  const toTimestamp = (value?: string | null): number => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const locationMap = new Map<string, Location>();

  const getKey = (loc: Location) =>
    loc.normalized_location_id || loc.location_id || loc.id;

  const hasHigherPriority = (candidate: Location, incumbent: Location) => {
    const candidateActive = candidate.is_active ? 1 : 0;
    const incumbentActive = incumbent.is_active ? 1 : 0;
    if (candidateActive !== incumbentActive) {
      return candidateActive > incumbentActive;
    }

    const candidateUpdated = toTimestamp(candidate.updated_at);
    const incumbentUpdated = toTimestamp(incumbent.updated_at);
    if (candidateUpdated !== incumbentUpdated) {
      return candidateUpdated > incumbentUpdated;
    }

    const candidateReviews = candidate.review_count ?? 0;
    const incumbentReviews = incumbent.review_count ?? 0;
    if (candidateReviews !== incumbentReviews) {
      return candidateReviews > incumbentReviews;
    }

    return false;
  };

  for (const location of rawLocations) {
    const key = getKey(location);
    const existing = locationMap.get(key);
    if (!existing) {
      locationMap.set(key, location);
      continue;
    }

    if (hasHigherPriority(location, existing)) {
      locationMap.set(key, location);
    }
  }

  const deduped = Array.from(locationMap.values());

  deduped.sort((a, b) => {
    const activeDiff = (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    if (activeDiff !== 0) {
      return activeDiff;
    }

    const updatedDiff = toTimestamp(b.updated_at) - toTimestamp(a.updated_at);
    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    const reviewDiff = (b.review_count ?? 0) - (a.review_count ?? 0);
    if (reviewDiff !== 0) {
      return reviewDiff;
    }

    return (a.location_name || '').localeCompare(b.location_name || '', undefined, { sensitivity: 'base' });
  });

  return deduped;
}

// Generate dynamic AI insights
function generateAIInsights(stats: DashboardStats, reviews: Review[]) {
  const insights: Array<{
    type: string;
    icon: string;
    title: string;
    description: string;
    color: string;
  }> = [];
  
  // Rating trend
  if (parseFloat(stats.avgRating) >= 4.5) {
    insights.push({
      type: 'positive',
      icon: '📈',
      title: 'Rating Trending Up',
      description: `Your ${stats.avgRating} rating is excellent! Keep up the great service.`,
      color: 'green'
    });
  } else if (parseFloat(stats.avgRating) < 3.0) {
    insights.push({
      type: 'negative',
      icon: '📉',
      title: 'Rating Needs Attention',
      description: `Your rating of ${stats.avgRating} needs improvement. Focus on customer satisfaction.`,
      color: 'red'
    });
  }
  
  // Response rate
  if (parseFloat(stats.responseRate) < 50) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Improve Response Rate',
      description: `${stats.pendingReviews} reviews unanswered. Quick replies increase trust by 78%.`,
      color: 'orange'
    });
  } else if (parseFloat(stats.responseRate) >= 80) {
    insights.push({
      type: 'positive',
      icon: '✅',
      title: 'Excellent Response Rate',
      description: `${stats.responseRate}% response rate is outstanding! Customers appreciate your engagement.`,
      color: 'green'
    });
  }
  
  // Questions
  if (stats.pendingQuestions > 0) {
    insights.push({
      type: 'urgent',
      icon: '❓',
      title: 'Questions Need Answers',
      description: `${stats.pendingQuestions} customer questions remain. Quick answers can convert by 45%.`,
      color: 'red'
    });
  }
  
  // Health score
  if (stats.healthScore < 50) {
    insights.push({
      type: 'warning',
      icon: '🏥',
      title: 'Health Score Low',
      description: `Your health score of ${stats.healthScore}% needs attention. Focus on reviews and responses.`,
      color: 'orange'
    });
  }
  
  return insights;
}

// Main Component
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    period?: string;
    start?: string;
    end?: string;
  };
}) {
  // Parse time filter from search params
  let startDate: string | undefined;
  let endDate: string | undefined;
  
  if (searchParams.period && searchParams.period !== 'all') {
    if (searchParams.start && searchParams.end) {
      // Custom date range
      startDate = searchParams.start;
      endDate = searchParams.end;
    } else if (searchParams.period === '7' || searchParams.period === '30' || searchParams.period === '90') {
      // Preset period
      const days = parseInt(searchParams.period);
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }
  }
  
  // Fetch all data with optional time filter
  const { reviews, locations, questions, accountId } = await getDashboardData(startDate, endDate);

  // Calculate stats
  const avgRating = calculateAverageRating(reviews);
  const responseRate = calculateResponseRate(reviews);
  const pendingReviews = getPendingReviews(reviews);
  const pendingQuestions = getPendingQuestions(questions);
  const pendingReviewsList = reviews
    .filter(r => !r.review_reply || r.review_reply.trim() === '')
    .map(r => ({ id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at }));
  const unansweredQuestionsList = questions
    .filter(q => !q.answer_text || q.answer_text.trim() === '' || q.answer_status === 'pending')
    .map(q => ({ id: q.id, question_text: q.question_text, created_at: q.created_at, upvotes: undefined as number | null | undefined }));
  
  const stats: DashboardStats = {
    totalLocations: locations.length,
    totalReviews: reviews.length,
    avgRating,
    responseRate,
    healthScore: calculateHealthScore({ avgRating, responseRate, totalReviews: reviews.length }),
    pendingReviews,
    pendingQuestions
  };
  const avgRatingValue = Number.parseFloat(stats.avgRating) || 0;
  const responseRateValue = Number.parseFloat(stats.responseRate) || 0;
  
  // Get active location and top performer
  const activeLocation = locations.find(location => location.is_active) || locations[0] || null;
  
  // Generate dynamic alerts
  const alerts: Array<{
    priority: 'HIGH' | 'MEDIUM';
    message: string;
    type: string;
    icon: string;
  }> = [];
  
  if (pendingReviews > 0) {
    alerts.push({
      priority: 'HIGH',
      message: `${pendingReviews} reviews awaiting response.`,
      type: 'reviews',
      icon: '🚨'
    });
  }
  
  if (pendingQuestions > 0) {
    alerts.push({
      priority: 'HIGH',
      message: `${pendingQuestions} customer questions need answering`,
      type: 'questions',
      icon: '🚨'
    });
  }
  
  if (parseFloat(responseRate) < 80) {
    alerts.push({
      priority: 'MEDIUM',
      message: `Response rate (${responseRate}%) is below target. Aim for 80%+.`,
      type: 'response_rate',
      icon: '⚠️'
    });
  }
  
  // Generate dynamic AI insights
  const insights = generateAIInsights(stats, reviews);
  
  // Weekly tasks are now handled by WeeklyTasksList component with real database data
  
  // Achievements with real data
  const achievements = [
    { 
      label: "Response Rate", 
      current: parseFloat(responseRate), 
      target: 90, 
      gradient: "from-orange-500 to-orange-600" 
    },
    { 
      label: "Health Score", 
      current: stats.healthScore, 
      target: 100, 
      gradient: "from-orange-500 to-yellow-500" 
    },
    { 
      label: "Reviews Count", 
      current: stats.totalReviews, 
      target: 500, 
      gradient: "from-blue-500 to-blue-600" 
    },
  ];
  
  const lastUpdatedAt = new Date().toISOString();

  return (
    <div className="min-h-screen bg-zinc-950 p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Auto-refresh on custom events */}
      <RefreshOnEvent eventName="dashboard:refresh" />
      
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-100 flex items-center gap-2 rtl:flex-row-reverse">
              <span className="rtl:order-2">🤖</span>
              <span className="rtl:order-1">AI Command Center</span>
            </h1>
            <p className="text-zinc-400 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">
              Proactive risk and growth optimization dashboard
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm flex-1 sm:flex-initial">
              <CardContent className="p-2 sm:p-3">
                <LastUpdated updatedAt={lastUpdatedAt} />
              </CardContent>
            </Card>
            <RefreshButton />
          </div>
        </div>

        {/* TIME FILTER BUTTONS */}
        <TimeFilterButtons />

        {/* ========================================= */}
        {/* CONNECTION & SYNC STATUS BANNER - START */}
        {/* ========================================= */}
        <div className="mb-4 sm:mb-6 md:mb-8 space-y-3 sm:space-y-4">
          {/* Case 1: No GMB Account Connected */}
          {!accountId && (
            <Card className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border-red-500/30 backdrop-blur-sm hover:border-red-500/50 transition-all">
              <CardContent className="py-4 sm:py-6 md:py-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full">
                    <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-2 text-center md:text-start rtl:text-right">
                      🔌 Connect Your Google My Business Account
                    </h3>
                    <p className="text-zinc-300 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base text-center md:text-start rtl:text-right">
                      Start managing your business by connecting your Google My Business account. 
                      You'll be able to manage locations, respond to reviews with AI, track analytics, and more.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 rtl:flex-row-reverse">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">✓</span>
                        </div>
                        <div className="rtl:text-right flex-1">
                          <p className="text-sm font-medium text-zinc-200">AI-Powered Replies</p>
                          <p className="text-xs text-zinc-400">Smart review responses</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 rtl:flex-row-reverse">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">📊</span>
                        </div>
                        <div className="rtl:text-right flex-1">
                          <p className="text-sm font-medium text-zinc-200">Real-time Analytics</p>
                          <p className="text-xs text-zinc-400">Track performance</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 rtl:flex-row-reverse">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">🗺️</span>
                        </div>
                        <div className="rtl:text-right flex-1">
                          <p className="text-sm font-medium text-zinc-200">Multi-Location</p>
                          <p className="text-xs text-zinc-400">Manage everything</p>
                        </div>
                      </div>
                    </div>
                    
                    <Link href="/settings?tab=connections" className="w-full sm:w-auto inline-block">
                      <Button className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base font-semibold">
                        🔗 Connect GMB Account Now
                        <svg className="ml-2 rtl:mr-2 rtl:ml-0 rtl:rotate-180 w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Case 2: GMB Connected but No Locations */}
          {accountId && (!locations || locations.length === 0) && (
            <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30 backdrop-blur-sm hover:border-orange-500/50 transition-all">
              <CardContent className="py-4 sm:py-6 md:py-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full">
                    <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-2 flex flex-wrap items-center gap-2 justify-center md:justify-start rtl:md:justify-end">
                      <span>🔄 Sync Your Locations</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Account Connected ✓
                      </Badge>
                    </h3>
                    <p className="text-zinc-300 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base text-center md:text-start rtl:text-right">
                      Your Google My Business account is connected successfully! 
                      Now sync your locations to start managing them from this dashboard.
                    </p>
                    
                    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 mb-4 sm:mb-6 rtl:flex-row-reverse">
                      <div className="text-2xl sm:text-3xl flex-shrink-0">💡</div>
                      <div className="flex-1 rtl:text-right">
                        <p className="text-sm font-medium text-zinc-200">What happens when you sync?</p>
                        <p className="text-xs text-zinc-400 mt-1">
                          We'll import all your business locations, recent reviews, questions, and performance data from Google.
                          This usually takes 10-30 seconds depending on the number of locations.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                      <SyncAllButton />
                      <Link href="/settings?tab=connections">
                        <Button variant="outline" className="w-full sm:w-auto border-zinc-700 hover:bg-zinc-800">
                          ⚙️ Manage Connection
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Case 3: Everything Working - Success Status */}
          {accountId && locations && locations.length > 0 && (
            <Card className="bg-zinc-900/50 border-green-500/30 backdrop-blur-sm hover:border-green-500/50 transition-all">
              <CardContent className="py-3 sm:py-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Status Info */}
                  <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto rtl:flex-row-reverse">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 rtl:text-right">
                      <div className="flex flex-wrap items-center gap-2 mb-1 rtl:flex-row-reverse rtl:justify-end">
                        <p className="text-sm sm:text-base font-semibold text-zinc-100">
                          GMB Account Connected
                        </p>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Active & Synced
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400">
                        {locations.length} location{locations.length !== 1 ? 's' : ''} • 
                        {' '}{stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''} • 
                        {' '}{stats.pendingReviews} pending
                      </p>
                    </div>
                  </div>
                  
                  {/* Right: Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-xs text-zinc-500 flex items-center gap-2 rtl:flex-row-reverse">
                      <Clock className="w-3 h-3" />
                      <LastUpdated updatedAt={lastUpdatedAt} />
                    </div>
                    <div className="flex gap-2">
                      <RefreshButton />
                      <Link href="/settings?tab=connections">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-zinc-700 hover:bg-zinc-800"
                        >
                          ⚙️ Settings
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        {/* CONNECTION & SYNC STATUS BANNER - END */}
        {/* ======================================== */}

        {/* ============================================ */}
        {/* ENHANCED STATS CARDS WITH TOOLTIPS - START */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <Card
            className={`bg-zinc-900/50 border backdrop-blur-sm hover:shadow-lg transition-all ${
              stats.healthScore >= 70
                ? 'border-green-500/30 hover:border-green-500/50'
                : stats.healthScore >= 40
                ? 'border-yellow-500/30 hover:border-yellow-500/50'
                : 'border-red-500/30 hover:border-red-500/50'
            }`}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2 rtl:flex-row-reverse">
                <p className="text-xs sm:text-sm font-medium text-zinc-400 rtl:text-right">Health Score</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-500 hover:text-zinc-300">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Overall health based on rating, response rate, and review count. Aim for 70%+.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-baseline gap-2 rtl:flex-row-reverse rtl:justify-end">
                <p
                  className={`text-2xl sm:text-3xl font-bold ${
                    stats.healthScore >= 70
                      ? 'text-green-400'
                      : stats.healthScore >= 40
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  {stats.healthScore}%
                </p>
                {stats.healthScore > 0 && (
                  <span
                    className={`text-xs ${
                      stats.healthScore >= 70
                        ? 'text-green-400'
                        : stats.healthScore >= 40
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {stats.healthScore >= 70 ? '✓ Great' : stats.healthScore >= 40 ? '⚠ Fair' : '✗ Poor'}
                  </span>
                )}
              </div>

              {stats.healthScore === 0 && (
                <p className="text-xs text-zinc-500 mt-2">No data yet - sync to calculate</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-primary/30 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-400">Locations</p>
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold text-zinc-100">{stats.totalLocations}</p>
              {stats.totalLocations === 0 ? (
                <p className="text-xs text-zinc-500 mt-2">Connect GMB to add locations</p>
              ) : (
                <p className="text-xs text-zinc-500 mt-2">
                  Active locations under management
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-orange-500/30 backdrop-blur-sm hover:border-orange-500/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-400">Average Rating</p>
                <Star className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-zinc-100">
                  {stats.avgRating}
                </p>
                <span className="text-sm text-zinc-500">/5</span>
              </div>
              {avgRatingValue === 0 ? (
                <p className="text-xs text-zinc-500 mt-2">No reviews yet — encourage customers to leave feedback</p>
              ) : (
                <p className="text-xs text-zinc-500 mt-2">
                  {avgRatingValue >= 4.5 ? 'Excellent reputation' : avgRatingValue >= 4 ? 'Good standing' : 'Needs improvement'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-blue-500/30 backdrop-blur-sm hover:border-blue-500/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-400">Reviews</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-500 hover:text-zinc-300">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.325 8.325 0 01-3.247-.63c-.365.187-.858.39-1.453.554-.735.204-1.397.293-1.9.316a.75.75 0 01-.743-1.012c.148-.42.355-.97.522-1.518C2.824 13.347 2 11.767 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zm-9-2a1 1 0 100 2 1 1 0 000-2zm3 0a1 1 0 100 2 1 1 0 000-2zm-6 0a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Total reviews synced from Google. Pending shows how many need responses.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold text-zinc-100">{stats.totalReviews}</p>
              <p className="text-xs text-zinc-500 mt-2">
                {stats.pendingReviews} pending response
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-purple-500/30 backdrop-blur-sm hover:border-purple-500/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-400">Response Rate</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-500 hover:text-zinc-300">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2 5a3 3 0 013-3h10a3 3 0 013 3v6a3 3 0 01-3 3h-3l-4 4v-4H5a3 3 0 01-3-3V5zm6.293 2.293a1 1 0 011.414 0L11 8.586l1.293-1.293a1 1 0 011.414 1.414L12.414 10l1.293 1.293a1 1 0 01-1.414 1.414L11 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L9.586 10 8.293 8.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Percentage of reviews with responses. Aim for 80%+ to boost visibility.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div
                className={`text-3xl font-bold ${
                  responseRateValue >= 80 ? 'text-green-400' : responseRateValue >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}
              >
                {stats.responseRate}%
              </div>
              {responseRateValue === 0 ? (
                <p className="text-xs text-zinc-500 mt-2">No responses yet — reply to reviews to build trust</p>
              ) : (
                <p className="text-xs text-zinc-500 mt-2">
                  {responseRateValue >= 80 ? 'Great job staying responsive' : 'Respond promptly to improve visibility'}
                </p>
              )}
              <Progress value={responseRateValue} className="h-1.5 bg-zinc-800 mt-3" />
            </CardContent>
          </Card>
        </div>
        {/* ENHANCED STATS CARDS WITH TOOLTIPS - END */}
        {/* =========================================== */}

        {/* Empty State for Locations */}
        {accountId && locations.length === 0 && (
          <Card className="bg-zinc-900/30 border-zinc-800 p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-zinc-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-200 mb-3">No Locations Found</h3>
                <p className="text-zinc-400">
                  We couldn't find any locations in your GMB account. This could be because:
                </p>
              </div>
              <ul className="text-left text-sm text-zinc-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>You haven't added any locations to your Google My Business account yet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>The sync hasn't been completed — try clicking "Sync All Locations".</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>There was an error during the last sync attempt.</span>
                </li>
              </ul>
              <div className="flex flex-wrap justify-center gap-3">
                <SyncAllButton />
                <Link href="https://business.google.com" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-zinc-700">
                    Add Location on Google
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* TAB-BASED NAVIGATION */}
        <DashboardTabs
          stats={stats}
          activeLocation={activeLocation as any}
          alerts={alerts}
          insights={insights}
          reviews={reviews}
          achievements={achievements}
          pendingReviewsList={pendingReviewsList}
          unansweredQuestionsList={unansweredQuestionsList}
          accountId={accountId}
          lastUpdatedAt={lastUpdatedAt}
        />
      </div>
    </div>
  );
}
