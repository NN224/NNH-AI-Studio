"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MapPin,
  Star,
  Clock,
  MessageSquare,
  FileText,
  HelpCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { WeeklyTasksList } from "@/components/dashboard/WeeklyTasksList";
import ReviewManagementCard from "@/components/reviews/review-management-card";
import PostManagementCard from "@/components/posts/post-management-card";
import QAManagementCard from "@/components/questions/qa-management-card";
import { MetricsPanel } from "@/components/analytics/metrics-panel";
import {
  RefreshButton,
  SyncAllButton,
  SyncButton,
  DisconnectButton,
  LocationCard,
  QuickActionsInteractive,
  ManageProtectionButton,
  LastUpdated,
} from "@/app/[locale]/(dashboard)/dashboard/DashboardClient";
import { PerformanceChart } from "@/app/[locale]/(dashboard)/dashboard/PerformanceChart";
import { GMBLocation } from "@/lib/types/gmb-types";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  review_reply: string | null;
  status: string | null;
  ai_sentiment: string | null;
  created_at: string;
}

interface DashboardStats {
  totalLocations: number;
  totalReviews: number;
  avgRating: string;
  responseRate: string;
  healthScore: number;
  pendingReviews: number;
  pendingQuestions: number;
}

interface DashboardTabsProps {
  stats: DashboardStats;
  activeLocation: GMBLocation | null;
  alerts: Array<{
    priority: 'HIGH' | 'MEDIUM';
    message: string;
    type: string;
    icon: string;
  }>;
  insights: Array<{
    type: string;
    icon: string;
    title: string;
    description: string;
    color: string;
  }>;
  reviews: Review[];
  achievements: Array<{
    label: string;
    current: number;
    target: number;
    gradient: string;
  }>;
  pendingReviewsList: Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  }>;
  unansweredQuestionsList: Array<{
    id: string;
    question_text: string;
    created_at: string;
    upvotes?: number | null;
  }>;
  accountId: string | null;
  lastUpdatedAt: string;
}

export function DashboardTabs({
  stats,
  activeLocation,
  alerts,
  insights,
  reviews,
  achievements,
  pendingReviewsList,
  unansweredQuestionsList,
  accountId,
  lastUpdatedAt,
}: DashboardTabsProps) {
  const avgRatingValue = Number.parseFloat(stats.avgRating) || 0;
  const responseRateValue = Number.parseFloat(stats.responseRate) || 0;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Reviews
          {stats.pendingReviews > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
              {stats.pendingReviews}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="posts" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Posts
        </TabsTrigger>
        <TabsTrigger value="qa" className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Q&A
          {stats.pendingQuestions > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
              {stats.pendingQuestions}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        {/* MAIN GRID LAYOUT - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
                  {stats.pendingReviews > 0 && (
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
      </TabsContent>

      {/* Reviews Tab */}
      <TabsContent value="reviews" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeLocation ? (
            <ReviewManagementCard location={activeLocation} />
          ) : (
            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-12 text-center">
                <p className="text-zinc-400">No active location selected</p>
              </CardContent>
            </Card>
          )}
          
          {/* Additional Review Stats Card */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                📊 Review Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                  <p className="text-zinc-400 text-sm mb-2">Average Rating</p>
                  <p className="text-3xl font-bold text-zinc-100">{stats.avgRating}</p>
                  <p className="text-xs text-zinc-500 mt-1">out of 5.0</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                  <p className="text-zinc-400 text-sm mb-2">Response Rate</p>
                  <p className={`text-3xl font-bold ${
                    responseRateValue >= 80 ? 'text-green-400' : 
                    responseRateValue >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {stats.responseRate}%
                  </p>
                  <Progress value={responseRateValue} className="h-1.5 bg-zinc-800 mt-2" />
                </div>
              </div>
              
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-300 mb-2">
                  {stats.pendingReviews} Reviews Need Response
                </p>
                <p className="text-xs text-zinc-400">
                  Quick responses improve customer trust and increase your Google ranking.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Posts Tab */}
      <TabsContent value="posts" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeLocation ? (
            <PostManagementCard location={activeLocation} />
          ) : (
            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-12 text-center">
                <p className="text-zinc-400">No active location selected</p>
              </CardContent>
            </Card>
          )}
          
          {/* Post Tips Card */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                💡 Post Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Post Regularly</p>
                    <p className="text-xs text-zinc-400">Post at least once a week to stay visible</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <span className="text-2xl">📸</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Use High-Quality Images</p>
                    <p className="text-xs text-zinc-400">Posts with images get 2x more engagement</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Include Call-to-Action</p>
                    <p className="text-xs text-zinc-400">Direct customers to take specific actions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Q&A Tab */}
      <TabsContent value="qa" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeLocation ? (
            <QAManagementCard location={activeLocation} />
          ) : (
            <Card className="bg-zinc-900/50 border-orange-500/20">
              <CardContent className="p-12 text-center">
                <p className="text-zinc-400">No active location selected</p>
              </CardContent>
            </Card>
          )}
          
          {/* Q&A Stats Card */}
          <Card className="bg-zinc-900/50 border-orange-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                📊 Q&A Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                  <p className="text-zinc-400 text-sm mb-2">Total Questions</p>
                  <p className="text-3xl font-bold text-zinc-100">{stats.pendingQuestions}</p>
                  <p className="text-xs text-zinc-500 mt-1">awaiting answer</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                  <p className="text-zinc-400 text-sm mb-2">Response Time</p>
                  <p className="text-3xl font-bold text-blue-400">24h</p>
                  <p className="text-xs text-zinc-500 mt-1">average</p>
                </div>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-300 mb-2">
                  Why Answering Questions Matters
                </p>
                <ul className="space-y-2 text-xs text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span>Answered questions appear on your Google Business Profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span>Quick responses show you're engaged with customers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span>FAQ answers help other potential customers too</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

DashboardTabs.displayName = "DashboardTabs";
