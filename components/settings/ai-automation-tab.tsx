"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Brain, Zap, Clock, CheckCircle, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface AIAutomationTabProps {
  aiResponseTone: string
  setAiResponseTone: (value: string) => void
  autoReply: boolean
  setAutoReply: (value: boolean) => void
  responseLength: string
  setResponseLength: (value: string) => void
  creativityLevel: string
  setCreativityLevel: (value: string) => void
}

export function AIAutomationTab({
  aiResponseTone,
  setAiResponseTone,
  autoReply,
  setAutoReply,
  responseLength,
  setResponseLength,
  creativityLevel,
  setCreativityLevel
}: AIAutomationTabProps) {
  return (
    <div className="space-y-6">
      {/* AI Response Configuration */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Response Generation
          </CardTitle>
          <CardDescription>
            Customize how AI generates responses for your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reply" className="flex items-center gap-2">
                Auto-reply to Reviews
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        AI will automatically generate and send replies to new reviews based on your settings
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Switch 
                id="auto-reply"
                checked={autoReply}
                onCheckedChange={setAutoReply}
              />
            </div>
            {autoReply && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Auto-reply is enabled. AI will respond to new reviews within 5 minutes using your configured tone and settings.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="ai-tone">Response Tone & Style</Label>
            <Select value={aiResponseTone} onValueChange={setAiResponseTone}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Professional</span>
                    <Badge variant="secondary" className="ml-2 text-xs">Recommended</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="friendly">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Friendly</span>
                  </div>
                </SelectItem>
                <SelectItem value="casual">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>Casual</span>
                  </div>
                </SelectItem>
                <SelectItem value="formal">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>Formal</span>
                  </div>
                </SelectItem>
                <SelectItem value="empathetic">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-pink-500" />
                    <span>Empathetic</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="p-3 bg-secondary/50 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {aiResponseTone === 'professional' && '🎯 Balanced, courteous, and business-appropriate responses'}
                {aiResponseTone === 'friendly' && '😊 Warm, approachable, and conversational responses'}
                {aiResponseTone === 'casual' && '👋 Relaxed, informal, and personable responses'}
                {aiResponseTone === 'formal' && '🎩 Polished, respectful, and traditional responses'}
                {aiResponseTone === 'empathetic' && '❤️ Understanding, caring, and emotionally aware responses'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="response-length">Response Length Preference</Label>
            <Select value={responseLength} onValueChange={setResponseLength}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief (1-2 sentences)</SelectItem>
                <SelectItem value="medium">Medium (2-4 sentences)</SelectItem>
                <SelectItem value="detailed">Detailed (4-6 sentences)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="creativity">AI Creativity Level</Label>
            <Select value={creativityLevel} onValueChange={setCreativityLevel}>
              <SelectTrigger className="bg-secondary border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (More consistent)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (More creative)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Lower values = More consistent. Higher values = More creative & varied responses.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Status */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Features & Capabilities
          </CardTitle>
          <CardDescription>
            Currently active AI-powered features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Smart Review Response Generation</p>
              <p className="text-xs text-muted-foreground mt-1">
                Context-aware responses tailored to each review's sentiment and content
              </p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Active</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Sentiment Analysis</p>
              <p className="text-xs text-muted-foreground mt-1">
                Automatic detection of positive, neutral, and negative sentiments
              </p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Active</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Content Optimization</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI suggestions to improve your posts and responses for better engagement
              </p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Active</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Post Auto-Scheduling</p>
              <p className="text-xs text-muted-foreground mt-1">
                Intelligent scheduling based on optimal posting times
              </p>
            </div>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Predictive Insights</p>
              <p className="text-xs text-muted-foreground mt-1">
                Forecasting trends and suggesting proactive actions
              </p>
            </div>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider Configuration */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Provider & Performance
          </CardTitle>
          <CardDescription>
            Multi-provider AI system for reliability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Active Providers (Fallback Chain)</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">1</Badge>
                  <span className="text-sm">Groq</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Primary</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">2</Badge>
                  <span className="text-sm">DeepSeek</span>
                </div>
                <Badge variant="outline" className="text-xs">Fallback</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">3</Badge>
                  <span className="text-sm">Together AI</span>
                </div>
                <Badge variant="outline" className="text-xs">Fallback</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">4</Badge>
                  <span className="text-sm">OpenAI</span>
                </div>
                <Badge variant="outline" className="text-xs">Fallback</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              System automatically tries providers in order until successful. This ensures 99.9% uptime.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
