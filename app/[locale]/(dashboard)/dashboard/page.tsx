import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  SyncButton,
  DisconnectButton,
  LocationCard,
  TimeFilterButtons,
  ViewDetailsButton,
  ManageProtectionButton,
  LastUpdated,
  QuickActionsInteractive
} from './DashboardClient';
import { WeeklyTasksList } from '@/components/dashboard/WeeklyTasksList';
import { ExpandableFeed } from '@/components/dashboard/ExpandableFeed';
import Link from 'next/link';
import { PerformanceChart } from './PerformanceChart';
import { RefreshOnEvent } from './RefreshOnEvent';
import { MetricsPanel } from '@/components/analytics/metrics-panel';

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
  location_name: string;
  rating: number | null;
  review_count: number | null;
  response_rate: number | null;
  is_active: boolean | null;
  address: string | null;
  category: string | null;
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
    const { data: locations, error: locationsError } = await supabase
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

    return {
      reviews: (reviews || []) as Review[],
      locations: (locations || []) as Location[],
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

function getTopLocation(locations: Location[]): Location | null {
  if (!locations || locations.length === 0) return null;
  return locations.reduce((prev, current) => 
    (current.rating || 0) > (prev.rating || 0) ? current : prev
  , locations[0]);
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
  
  // Get active location and top performer
  const activeLocation = locations[0] || null;
  const topLocation = getTopLocation(locations);
  
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
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6 lg:p-8">
      {/* Auto-refresh on custom events */}
      <RefreshOnEvent eventName="dashboard:refresh" />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 flex items-center gap-2">
              🤖 AI Command Center
            </h1>
            <p className="text-zinc-400 mt-2 text-sm md:text-base">
              Proactive risk and growth optimization dashboard
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm">
              <CardContent className="p-3">
                <LastUpdated updatedAt={lastUpdatedAt} />
              </CardContent>
            </Card>
            <RefreshButton />
          </div>
        </div>

        {/* TIME FILTER BUTTONS */}
        <TimeFilterButtons />

        {/* KEY METRICS ROW - أهم 5 مقاييس في الأعلى */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Health Score */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">🏥 Health Score</span>
              </div>
              <div className="text-3xl font-bold text-zinc-100">{stats.healthScore}%</div>
              <Progress value={stats.healthScore} className="h-1.5 bg-zinc-800 mt-3" />
            </CardContent>
          </Card>

          {/* Total Locations */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">📍 Locations</span>
              </div>
              <div className="text-3xl font-bold text-zinc-100">{stats.totalLocations}</div>
              <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                vs last period
              </p>
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">⭐ Avg Rating</span>
              </div>
              <div className="text-3xl font-bold text-zinc-100">
                {stats.avgRating}<span className="text-xl text-zinc-500">/5</span>
              </div>
              <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Excellent
              </p>
            </CardContent>
          </Card>

          {/* Total Reviews */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">💬 Reviews</span>
              </div>
              <div className="text-3xl font-bold text-zinc-100">{stats.totalReviews}</div>
              <p className="text-zinc-400 text-xs mt-2">{stats.pendingReviews} pending</p>
            </CardContent>
          </Card>

          {/* Response Rate */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">📈 Response</span>
              </div>
              <div className={`text-3xl font-bold ${parseFloat(stats.responseRate) < 50 ? 'text-red-400' : 'text-zinc-100'}`}>
                {stats.responseRate}%
              </div>
              <Progress value={parseFloat(stats.responseRate)} className="h-1.5 bg-zinc-800 mt-3" />
            </CardContent>
          </Card>
        </div>

        {/* MAIN GRID LAYOUT - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Location Management */}
          <div className="space-y-4">
            {/* Active Location Card */}
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  📍 Active Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={activeLocation?.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-orange-500/20 text-orange-400 border-orange-500/30"}>
                    {activeLocation?.is_active ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                
                {activeLocation && (
                  <div className="flex gap-2">
                    <SyncButton locationId={activeLocation.id} />
                    <DisconnectButton locationId={activeLocation.id} />
                  </div>
                )}
                
                {activeLocation ? (
                  <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2 border border-zinc-700/50">
                    <p className="text-zinc-100 font-medium truncate">{activeLocation.location_name}</p>
                    <div className="flex items-center gap-1 text-sm text-zinc-400">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{activeLocation.rating?.toFixed(1) || 'N/A'} / 5.0</span>
                    </div>
                    {activeLocation.id && (
                      <LocationCard 
                        locationName={activeLocation.location_name} 
                        href={`/locations/${activeLocation.id}`} 
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 py-4">
                    No active location found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Section */}
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  ⚡ Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickActionsInteractive
                  pendingReviews={pendingReviewsList}
                  unansweredQuestions={unansweredQuestionsList}
                  locationId={activeLocation?.id}
                />
              </CardContent>
            </Card>
          </div>

          {/* CENTER COLUMN - Monitoring & Alerts */}
          <div className="space-y-4">
            {/* AI Risk & Opportunity Feed */}
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                      🎯 AI Alerts
                    </CardTitle>
                    <p className="text-zinc-400 text-sm mt-1">
                      Proactive recommendations
                    </p>
                  </div>
                  {alerts.length > 0 && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      {alerts.length} items
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.slice(0, 3).map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          alert.priority === 'HIGH'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-yellow-500/10 border-yellow-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{alert.icon}</span>
                          <div className="flex-1 min-w-0">
                            <Badge 
                              className={`mb-1 text-xs ${
                                alert.priority === 'HIGH'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              }`}
                            >
                              {alert.priority}
                            </Badge>
                            <p className="text-sm text-zinc-200">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 py-8 text-sm">
                    🎉 No urgent alerts!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  📊 Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart reviews={reviews} />
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  💡 AI Insights
                </CardTitle>
                <p className="text-zinc-400 text-sm mt-1">
                  Smart recommendations based on your data
                </p>
              </CardHeader>
              <CardContent>
                {insights.length > 0 ? (
                  <div className="space-y-2">
                    {insights.slice(0, 4).map((insight, idx) => {
                      const bgColor = 
                        insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                        insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                        'bg-blue-500/10 border-blue-500/30';
                      
                      return (
                        <div key={idx} className={`p-3 rounded-lg border ${bgColor}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{insight.icon}</span>
                            <p className="text-sm text-zinc-200 flex-1">{insight.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 py-6 text-sm">
                    No insights yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - Actions & Tasks */}
          <div className="lg:col-span-1 space-y-6">
            {/* Weekly Tasks Card */}
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  ⚡ Weekly Tasks
                </CardTitle>
                <p className="text-zinc-400 text-sm mt-1">
                  AI-powered recommendations to improve your business
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <WeeklyTasksList locationId={activeLocation?.id} />
              </CardContent>
            </Card>

            {/* Profile Protection Card */}
            <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  🛡️ Profile Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-5xl font-bold text-zinc-100 text-center">
                  {stats.healthScore >= 70 ? stats.totalLocations : 0}/{stats.totalLocations}
                </div>
                
                <div className="space-y-2">
                  {stats.healthScore < 70 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-400">
                      <span>⚠️</span>
                      <span>Improve health score to activate</span>
                    </div>
                  )}
                  {pendingReviews > 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-400">
                      <span>⚠️</span>
                      <span>Pending items need attention</span>
        </div>
      )}
                </div>

                <ManageProtectionButton />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* BOTTOM ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Comparison */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                📊 Performance Comparison
              </CardTitle>
              <p className="text-zinc-400 text-sm mt-1">
                Compare this month vs last month performance
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                  <p className="text-zinc-400 text-xs mb-1">Questions</p>
                  <p className="text-zinc-100 text-xl font-bold">{stats.pendingQuestions}</p>
                  <p className="text-zinc-400 text-xs mt-1">Current</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                  <p className="text-zinc-400 text-xs mb-1">Rating</p>
                  <p className="text-zinc-100 text-xl font-bold">{stats.avgRating}</p>
                  <p className="text-zinc-400 text-xs mt-1">Average</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                  <p className="text-zinc-400 text-xs mb-1">Reviews</p>
                  <p className="text-zinc-100 text-xl font-bold">{stats.totalReviews}</p>
                  <p className="text-zinc-400 text-xs mt-1">Total</p>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <PerformanceChart reviews={reviews} />
              </div>

              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-zinc-400">Questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-zinc-400">Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-zinc-400">Reviews</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements & Progress */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                🏆 Achievements & Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.map((achievement, index) => {
                const percentage = (achievement.current / achievement.target) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{achievement.label}</span>
                      <span className="text-zinc-400">
                        {achievement.current.toFixed(1)} / {achievement.target}
                      </span>
                    </div>
                    <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${achievement.gradient} transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* SYNC METRICS PANEL */}
        <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm hover:border-orange-500/50 transition-all">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              🔧 Sync Metrics
            </CardTitle>
            <p className="text-zinc-400 text-sm mt-1">Historic performance of each sync phase</p>
          </CardHeader>
          <CardContent>
            {accountId ? (
              <MetricsPanel accountId={accountId} />
            ) : (
              <div className="text-sm text-zinc-500">No active account detected.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
