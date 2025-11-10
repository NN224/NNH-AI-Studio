"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageCircle, CheckCircle, Clock } from "lucide-react";
import { GMBLocation } from "@/lib/types/gmb-types";
import Link from "next/link";

interface QAManagementCardProps {
  location: GMBLocation;
}

/**
 * Displays Q&A management options and statistics for a GMB location
 */
const QAManagementCard = ({ location }: QAManagementCardProps) => {
  return (
    <Card className="bg-zinc-900/50 border-orange-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-orange-500" />
          Questions & Answers
        </CardTitle>
        <CardDescription>Manage customer questions for {location.location_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-300 mb-1">
                Answer Questions Quickly
              </p>
              <p className="text-xs text-zinc-400">
                Quick responses to customer questions improve your business credibility. 
                Answered questions appear on your Google Business Profile.
              </p>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Answered Questions */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-zinc-400">Answered</span>
            </div>
            <p className="text-2xl font-bold text-green-400">0</p>
            <p className="text-xs text-zinc-500">questions</p>
          </div>
          
          {/* Pending Questions */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-zinc-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-orange-400">0</p>
            <p className="text-xs text-zinc-500">questions</p>
          </div>
        </div>
        
        {/* Quick Tips */}
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
          <p className="text-sm font-medium text-zinc-300 mb-2">💡 Pro Tips</p>
          <ul className="space-y-1 text-xs text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-400 flex-shrink-0">•</span>
              <span>Answer within 24 hours for better engagement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 flex-shrink-0">•</span>
              <span>Use AI assistance to craft professional responses</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 flex-shrink-0">•</span>
              <span>FAQ answers help other customers too</span>
            </li>
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2">
          <Link href="/questions" className="block">
            <Button className="w-full" variant="default">
              <HelpCircle className="h-4 w-4 mr-2" />
              View All Questions
            </Button>
          </Link>
          <Link href="/questions?status=pending" className="block">
            <Button className="w-full" variant="outline">
              Answer Pending Questions
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

QAManagementCard.displayName = "QAManagementCard";

export default QAManagementCard;
