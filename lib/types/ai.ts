export type AIProvider = 'gemini' | 'anthropic' | 'openai' | 'groq' | 'deepseek'
export type AIModel = string

export interface QuestionContext {
  question: string
  businessInfo: {
    name: string
    category: string
    description?: string
    hours?: BusinessHours
    services?: string[]
    attributes?: Record<string, string | number | boolean>
    location?: {
      address: string
      phone?: string
      website?: string
    }
  }
  previousQuestions?: Array<{
    question: string
    answer: string
  }>
  language: 'ar' | 'en' | 'auto'
  tone: string
}

export interface AnswerResult {
  text: string
  confidence: number
  category: QuestionCategory
  provider: AIProvider
  processingTime: number
}

export type QuestionCategory = 'hours' | 'location' | 'services' | 'pricing' | 'general'

export interface BusinessHours {
  [day: string]: {
    open: string
    close: string
  }
}

// ============================================================================
// Chat & Messaging Types
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date | string
  metadata?: Record<string, string | number | boolean>
}

export interface ChatResponse {
  message: ChatMessage
  suggestions?: string[]
  error?: string
  processingTime?: number
}

// ============================================================================
// AI Insights & Analytics Types
// ============================================================================

export interface AIInsight {
  id: string
  type: 'positive' | 'negative' | 'neutral' | 'warning' | 'info'
  category: 'reviews' | 'engagement' | 'performance' | 'trends' | 'opportunities'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  data?: {
    metric?: string
    value?: number | string
    change?: number
    period?: string
  }
  recommendations?: string[]
  suggestedActions?: Array<{
    label: string
    action: string
    data?: Record<string, unknown>
  }>
  createdAt: Date | string
}

export interface AIPrediction {
  id: string
  metric: string
  predictedValue: number
  currentValue: number
  change: number
  changePercent: number
  confidence: number
  timeframe: string
  factors: Array<{
    name: string
    impact: number
    description?: string
  }>
}

export interface AIAnomaly {
  id: string
  metric: string
  detectedValue: number
  expectedValue: number
  deviation: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  timestamp: Date | string
  possibleCauses: string[]
  suggestedActions?: string[]
}

export interface AIInsightsResponse {
  insights: AIInsight[]
  predictions: AIPrediction[]
  anomalies: AIAnomaly[]
  summary: {
    totalInsights: number
    criticalItems: number
    opportunitiesCount: number
    overallScore?: number
  }
  generatedAt: Date | string
  error?: string
}

// ============================================================================
// Automation Types
// ============================================================================

export interface AutomationStatus {
  enabled: boolean
  activeRules: number
  totalActions: number
  lastRunAt?: Date | string
  nextRunAt?: Date | string
  status: 'active' | 'paused' | 'error' | 'idle'
  upcomingActions: UpcomingAction[]
  recentLogs: AutomationLog[]
  statistics?: {
    successRate: number
    totalExecutions: number
    failedExecutions: number
    avgExecutionTime: number
  }
}

export interface UpcomingAction {
  id: string
  type: 'review_reply' | 'question_answer' | 'post_creation' | 'report_generation' | 'sync'
  scheduledFor: Date | string
  targetId?: string
  targetType?: string
  status: 'pending' | 'scheduled' | 'processing'
  priority?: 'high' | 'medium' | 'low'
  description?: string
}

export interface AutomationLog {
  id: string
  action: string
  type: UpcomingAction['type']
  status: 'success' | 'failed' | 'skipped' | 'partial'
  executedAt: Date | string
  duration?: number
  targetId?: string
  error?: string
  details?: string
  metadata?: Record<string, string | number | boolean>
}

// ============================================================================
// AI Provider Configuration Types
// ============================================================================

export interface AIProviderConfig {
  provider: AIProvider
  model: AIModel
  apiKey: string // Make required
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  customHeaders?: Record<string, string>
  timeout?: number
  retryAttempts?: number
}

export interface AIRequest {
  id?: string
  user_id?: string
  provider: string
  model: string
  feature: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost_usd?: number
  latency_ms?: number
  success: boolean
  error?: string
  location_id?: string
  created_at?: string
}
