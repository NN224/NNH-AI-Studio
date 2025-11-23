"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { getDashboardStats, getPerformanceChartData } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileCompletionCard } from "@/components/dashboard/ProfileCompletionCard";
import { AICommandCenterCards } from "@/components/dashboard/AICommandCenterCards";
import { GamificationCard } from "@/components/dashboard/GamificationCard";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { Sun, Bell, Search, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
} as const;

const NewDashboardClient = () => {
  // Fetch dashboard data
  useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => getDashboardStats(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ["performanceChartData"],
    queryFn: () => getPerformanceChartData(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Mock data for profile completion
  const profileSteps = [
    { id: "1", label: "Verify your email", completed: true },
    { id: "2", label: "Connect Google Business Profile", completed: true },
    { id: "3", label: "Add business description", completed: false },
    { id: "4", label: "Upload logo and cover", completed: false },
  ];

  // Mock data for gamification
  const achievements = [
    {
      id: "1",
      icon: <Sun className="h-5 w-5 text-orange-500" />,
      title: "Early Adopter",
      description: "Joined during beta",
      progress: 100,
      total: 100,
    },
    {
      id: "2",
      icon: <Bell className="h-5 w-5 text-blue-500" />,
      title: "Responsive",
      description: "Replied to 50 reviews",
      progress: 35,
      total: 50,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <motion.div
        className="max-w-7xl mx-auto space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Sun className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Good morning,{" "}
                <span className="text-orange-500">nabel al chaar!</span>
              </h1>
              <p className="text-zinc-400 text-sm">
                Here's what's happening with your business today.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Top Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile Completion & AI Command Center */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileCompletionCard
                  completionPercentage={75}
                  steps={profileSteps}
                />
                <AICommandCenterCards />
              </div>
            </motion.div>

            {/* Stats Row */}
            <motion.div variants={itemVariants}>
              <StatsRow />
            </motion.div>

            {/* Performance Chart */}
            <motion.div variants={itemVariants}>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceChart
                    title="Search Views"
                    data={chartData || []}
                    dataKey="value"
                    xAxisKey="date"
                    isLoading={isLoadingChart}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column: Gamification & Recommendations */}
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="h-full">
              <GamificationCard
                level={3}
                currentXp={1450}
                nextLevelXp={2000}
                achievements={achievements}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NewDashboardClient;
