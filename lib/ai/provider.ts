/**
 * AI Provider Utility
 * Handles communication with AI providers (OpenAI, Anthropic, Google)
 */

import { createClient } from '@/lib/supabase/server'
import type { AIProviderConfig, AIRequest } from '@/lib/types/ai'

/**
 * AI Usage interface for token tracking
 */
export interface AIUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

/**
 * AI Response interface
 */
export interface AIResponse {
  content: string
  usage: AIUsage
}

export class AIProvider {
  private config: AIProviderConfig
  private userId: string

  constructor(config: AIProviderConfig, userId: string) {
    this.config = config
    this.userId = userId
  }

  /**
   * Generate AI completion
   */
  async generateCompletion(
    prompt: string,
    feature: string,
    locationId?: string,
  ): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      let content: string
      let usage: AIUsage

      switch (this.config.provider) {
        case 'openai':
          ;({ content, usage } = await this.callOpenAI(prompt))
          break
        case 'anthropic':
          try {
            ;({ content, usage } = await this.callAnthropic(prompt))
          } catch (primaryError) {
            // Attempt graceful fallback to OpenAI or Google if available
            const sysOpenAI = process.env.SYSTEM_OPENAI_API_KEY || process.env.OPENAI_API_KEY
            const sysGoogle = process.env.SYSTEM_GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
            if (sysOpenAI) {
              const fallback = new AIProvider(
                {
                  provider: 'openai',
                  model: 'gpt-4o-mini',
                  maxTokens: this.config.maxTokens,
                  temperature: this.config.temperature,
                  apiKey: sysOpenAI,
                },
                this.userId,
              )
              ;({ content, usage } = await fallback.callOpenAI(prompt))
              break
            } else if (sysGoogle) {
              const fallback = new AIProvider(
                {
                  provider: 'gemini',
                  model: 'gemini-1.5-pro',
                  maxTokens: this.config.maxTokens,
                  temperature: this.config.temperature,
                  apiKey: sysGoogle,
                },
                this.userId,
              )
              ;({ content, usage } = await fallback.callGoogle(prompt))
              break
            }
            throw primaryError
          }
          break
        case 'gemini':
          ;({ content, usage } = await this.callGoogle(prompt))
          break
        case 'groq':
          ;({ content, usage } = await this.callGroq(prompt))
          break
        case 'deepseek':
          ;({ content, usage } = await this.callDeepSeek(prompt))
          break
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`)
      }

      const latency = Date.now() - startTime

      // Log request to database
      await this.logRequest({
        user_id: this.userId,
        provider: this.config.provider,
        model: this.config.model,
        feature,
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        cost_usd: this.calculateCost(usage),
        latency_ms: latency,
        success: true,
        location_id: locationId,
      })

      return { content, usage }
    } catch (error) {
      const latency = Date.now() - startTime

      // Log failed request
      await this.logRequest({
        user_id: this.userId,
        provider: this.config.provider,
        model: this.config.model,
        feature,
        success: false,
        latency_ms: latency,
        location_id: locationId,
      })

      throw error
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant specialized in Google My Business analytics and insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    }
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(prompt: string): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      } as HeadersInit,
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system:
          'You are an AI assistant specialized in Google My Business analytics and insights. Always return ONLY valid JSON as instructed. Never include markdown or code fences.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      let errText = ''
      try {
        errText = await response.text()
      } catch {
        // Ignore text parsing errors
      }
      let errMsg = 'Unknown error'
      try {
        errMsg = JSON.parse(errText)?.error?.message || errText
      } catch {
        errMsg = errText || errMsg
      }
      throw new Error(`Anthropic API error: ${errMsg}`)
    }

    const data = await response.json()
    return {
      content: data.content[0].text,
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    }
  }

  /**
   * Call Google AI API
   */
  private async callGoogle(prompt: string): Promise<AIResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens,
          },
        }),
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Google AI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const content = data.candidates[0].content.parts[0].text

    // Google doesn't provide token counts in the same way
    const estimatedTokens = Math.ceil(content.length / 4)

    return {
      content,
      usage: {
        prompt_tokens: Math.ceil(prompt.length / 4),
        completion_tokens: estimatedTokens,
        total_tokens: Math.ceil(prompt.length / 4) + estimatedTokens,
      },
    }
  }

  /**
   * Call Groq API (OpenAI-compatible)
   */
  private async callGroq(prompt: string): Promise<AIResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant specialized in Google My Business analytics and insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    }
  }

  /**
   * Call DeepSeek API (OpenAI-compatible)
   */
  private async callDeepSeek(prompt: string): Promise<AIResponse> {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI assistant specialized in Google My Business analytics and insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`DeepSeek API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    }
  }

  /**
   * Calculate cost based on usage
   */
  private calculateCost(usage: AIUsage): number {
    const { prompt_tokens = 0, completion_tokens = 0 } = usage

    // Pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 30, output: 60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      'gemini-pro': { input: 0.5, output: 1.5 },
    }

    const modelPricing = pricing[this.config.model] || { input: 1, output: 2 }

    const inputCost = (prompt_tokens / 1_000_000) * modelPricing.input
    const outputCost = (completion_tokens / 1_000_000) * modelPricing.output

    return inputCost + outputCost
  }

  /**
   * Log AI request to database
   */
  private async logRequest(request: Omit<AIRequest, 'id' | 'created_at'>): Promise<void> {
    try {
      const supabase = await createClient()
      await supabase.from('ai_requests').insert(request)
    } catch (error) {
      console.error('Failed to log AI request:', error)
      // Don't throw - logging failure shouldn't break the main flow
    }
  }
}

/**
 * Get AI provider for user
 */
export async function getAIProvider(userId: string): Promise<AIProvider | null> {
  const supabase = await createClient()

  // Get active AI settings for user
  const { data: settings, error } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)
    .single()

  // Default model configurations (updated 2025)
  const modelConfig: Record<string, { model: string; maxTokens: number; temperature: number }> = {
    openai: { model: 'gpt-4o-mini', maxTokens: 4000, temperature: 0.7 },
    anthropic: { model: 'claude-3-5-sonnet-latest', maxTokens: 4000, temperature: 0.7 },
    google: { model: 'gemini-1.5-pro', maxTokens: 4000, temperature: 0.7 },
    groq: { model: 'llama-3.3-70b-versatile', maxTokens: 4000, temperature: 0.7 },
    deepseek: { model: 'deepseek-chat', maxTokens: 4000, temperature: 0.7 },
  }

  // 1) If user has explicit settings in DB, use them
  if (!error && settings) {
    const cfg = modelConfig[settings.provider]
    return new AIProvider(
      {
        provider: settings.provider as AIProviderConfig['provider'],
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
        apiKey: settings.api_key,
      },
      userId,
    )
  }

  // 2) Fallback to system-level keys (priority: Anthropic → OpenAI → Google)
  const sysAnthropic = process.env.SYSTEM_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  if (sysAnthropic) {
    const cfg = modelConfig['anthropic']
    return new AIProvider(
      {
        provider: 'anthropic',
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
        apiKey: sysAnthropic,
      },
      userId,
    )
  }

  const sysOpenAI = process.env.SYSTEM_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (sysOpenAI) {
    const cfg = modelConfig['openai']
    return new AIProvider(
      {
        provider: 'openai',
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
        apiKey: sysOpenAI,
      },
      userId,
    )
  }

  const sysGoogle = process.env.SYSTEM_GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (sysGoogle) {
    const cfg = modelConfig['google']
    return new AIProvider(
      {
        provider: 'gemini',
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
        apiKey: sysGoogle,
      },
      userId,
    )
  }

  // If nothing configured
  return null
}
