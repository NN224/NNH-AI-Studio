/**
 * AI Types for Dashboard
 * Types for AI-powered features including insights, chat, and automation
 */

export interface AIInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'recommendation' | 'competitor' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  category: string;
  suggestedActions: AIAction[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface AIAction {
  id: string;
  label: string;
  description: string;
  actionType: 'navigate' | 'api_call' | 'external_link';
  actionUrl?: string;
  actionPayload?: Record<string, any>;
  icon?: string;
}

export interface AIPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  change: number;
  changePercent: number;
  confidence: number;
  timeframe: string;
  factors: string[];
}

export interface AIAnomaly {
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: 'critical' | 'warning' | 'info';
  detectedAt: Date;
  possibleCauses: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatContext {
  userId: string;
  conversationId: string;
  messages: ChatMessage[];
  dashboardData?: Record<string, any>;
}

export interface AIRequest {
  id?: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  feature: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  latency_ms?: number;
  success: boolean;
  location_id?: string;
  created_at?: Date;
}

export interface AISettings {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'google';
  api_key: string;
  is_active: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface AutomationStatus {
  totalAutomations: number;
  activeAutomations: number;
  successRate: number;
  timeSavedHours: number;
  upcomingActions: UpcomingAction[];
  recentLogs: AutomationLog[];
}

export interface UpcomingAction {
  id: string;
  type: string;
  scheduledAt: Date;
  locationName: string;
  description: string;
}

export interface AutomationLog {
  id: string;
  action_type: string;
  action_description: string;
  status: 'success' | 'failed' | 'pending';
  created_at: Date;
  metadata?: Record<string, any>;
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  predictions: AIPrediction[];
  anomalies: AIAnomaly[];
  summary: string;
  generatedAt: Date;
  cacheKey: string;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  actions?: AIAction[];
  data?: Record<string, any>;
}

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
}

export interface AIUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  avgLatency: number;
  requestsByFeature: Record<string, number>;
  costByFeature: Record<string, number>;
}

