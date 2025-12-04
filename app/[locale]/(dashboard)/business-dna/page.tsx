/**
 * 🧬 BUSINESS DNA PAGE
 *
 * Shows complete Business DNA analysis.
 * Surfaces data from business_dna table.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBusinessDNA } from "@/lib/services/business-dna-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Brain,
  TrendingUp,
  Users,
  Clock,
  Target,
  MessageSquare,
  Globe,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Business DNA | NNH AI Studio",
  description: "View your complete Business DNA analysis",
};

export default async function BusinessDNAPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const dna = await getBusinessDNA(user.id);

  if (!dna) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Building Your Business DNA
          </h2>
          <p className="text-zinc-400">
            Analyzing your reviews and customer feedback...
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Check back in a few minutes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Business DNA</h1>
        <p className="text-zinc-400">
          AI-powered analysis of your business identity and patterns
        </p>
      </div>

      {/* Confidence Score */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-400" />
              DNA Confidence Score
            </CardTitle>
            <Badge
              variant={dna.confidenceScore >= 80 ? "default" : "secondary"}
              className="text-lg px-4 py-1"
            >
              {dna.confidenceScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={dna.confidenceScore} className="h-3" />
          <p className="text-sm text-zinc-400 mt-2">
            Based on {dna.totalReviews} reviews analyzed
          </p>
        </CardContent>
      </Card>

      {/* Identity Section */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-400" />
            Business Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Business Type</p>
              <p className="text-white font-medium">{dna.businessType}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Category</p>
              <p className="text-white font-medium">{dna.businessCategory}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Target Audience</p>
              <p className="text-white font-medium">{dna.targetAudience}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Brand Voice</p>
              <p className="text-white font-medium">{dna.brandVoice}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-2">Languages</p>
            <div className="flex gap-2 flex-wrap">
              {dna.languages.map((lang) => (
                <Badge key={lang} variant="outline">
                  <Globe className="h-3 w-3 mr-1" />
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <TrendingUp className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dna.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="text-zinc-300">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dna.weaknesses.map((weakness, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">!</span>
                  <span className="text-zinc-300">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Common Topics */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Common Topics in Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dna.commonTopics.slice(0, 10).map((topic, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">{topic.topic}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        topic.sentiment === "positive"
                          ? "default"
                          : topic.sentiment === "negative"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {topic.sentiment}
                    </Badge>
                    <span className="text-sm text-zinc-500">
                      {topic.mentions} mentions
                    </span>
                  </div>
                </div>
                <Progress
                  value={(topic.mentions / dna.totalReviews) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer Personas */}
      {dna.customerPersonas.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Customer Personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dna.customerPersonas.map((persona, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{persona.type}</h4>
                    <Badge>{persona.percentage}%</Badge>
                  </div>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    {persona.characteristics.map((char, j) => (
                      <li key={j}>• {char}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peak Times */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            Peak Activity Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-zinc-500 mb-2">Busiest Days</p>
            <div className="flex gap-2 flex-wrap">
              {dna.peakDays.map((day) => (
                <Badge key={day} variant="default">
                  {day}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-2">Peak Hours</p>
            <div className="flex gap-2 flex-wrap">
              {dna.peakHours.map((hour) => (
                <Badge key={hour} variant="secondary">
                  {hour}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>
              Last updated:{" "}
              {new Date(dna.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span>{dna.totalReviews} reviews analyzed</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
