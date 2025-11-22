"use client";

import { motion } from "framer-motion";
import { Shield, Star, Activity, Zap, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color: string;
}

function StatItem({
  label,
  value,
  icon,
  trend,
  trendUp,
  color,
}: StatItemProps) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className={`p-3 rounded-lg bg-opacity-10 ${color.replace("text-", "bg-")}`}
        >
          <div className={color}>{icon}</div>
        </div>
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{value}</span>
            {trend && (
              <span
                className={`text-xs ${trendUp ? "text-green-500" : "text-red-500"}`}
              >
                {trend}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsRow() {
  const stats = [
    {
      label: "Cyber Risk",
      value: "Low",
      icon: <Shield className="h-5 w-5" />,
      color: "text-green-500",
    },
    {
      label: "Reputation",
      value: "98%",
      icon: <Star className="h-5 w-5" />,
      trend: "+2.4%",
      trendUp: true,
      color: "text-yellow-500",
    },
    {
      label: "Engagement",
      value: "High",
      icon: <Activity className="h-5 w-5" />,
      color: "text-blue-500",
    },
    {
      label: "Response Rate",
      value: "100%",
      icon: <Zap className="h-5 w-5" />,
      color: "text-purple-500",
    },
    {
      label: "Profile Views",
      value: "1.2k",
      icon: <Users className="h-5 w-5" />,
      trend: "+12%",
      trendUp: true,
      color: "text-orange-500",
    },
    {
      label: "Growth",
      value: "+15%",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-pink-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <StatItem {...stat} />
        </motion.div>
      ))}
    </div>
  );
}
