"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw, BarChart2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: "Reply to Reviews",
      icon: MessageSquare,
      onClick: () => router.push("/reviews"),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Update Info",
      icon: RefreshCw,
      onClick: () => router.push("/locations"), // Or a specific edit modal
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "View Insights",
      icon: BarChart2,
      onClick: () => router.push("/analytics"),
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Manage Q&A",
      icon: Users,
      onClick: () => router.push("/questions"),
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
        <CardDescription>Common tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed hover:border-solid hover:bg-accent/50"
              onClick={action.onClick}
            >
              <div className={`p-2 rounded-full ${action.bg}`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
