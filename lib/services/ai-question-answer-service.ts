import { getAIProvider } from '@/lib/ai/provider'
import type { AIProvider as AIProviderType } from '@/lib/types/ai'

export interface QuestionContext {
  question: string
  businessInfo: {
    name: string
    category: string
    description?: string
    hours?: Record<string, { open: string; close: string }>
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
  userId: string
  locationId?: string
}

export interface AnswerResult {
  answer: string
  confidence: number
  category: QuestionCategory
  provider: AIProviderType
  model: string
  processingTime: number
  tokensUsed?: number
  contextUsed: Record<string, unknown>
}

export type QuestionCategory = 'hours' | 'location' | 'services' | 'pricing' | 'general'

export class AIQuestionAnswerService {
  async generateAnswer(context: QuestionContext): Promise<AnswerResult> {
    const startTime = Date.now()

    try {
      // 1. تحليل السؤال وتحديد الفئة
      const category = this.categorizeQuestion(context.question)
      console.log('[AI Q&A] Question category:', category)

      // 2. جمع المعلومات ذات الصلة
      const relevantInfo = this.extractRelevantInfo(category, context.businessInfo)

      // 3. تحديد المزود (Gemini للأسئلة الواقعية، Anthropic للعامة)
      const preferredProvider: AIProviderType = category === 'general' ? 'anthropic' : 'gemini'

      // 4. بناء prompt محسّن
      const prompt = this.buildPrompt(context, category, relevantInfo)

      // 5. الحصول على AI provider
      const aiProvider = await getAIProvider(context.userId)
      if (!aiProvider) {
        console.error('[AI Q&A] No AI provider configured for user:', context.userId)
        throw new Error(
          'No AI provider configured. Please set up an API key in Settings > AI Configuration.',
        )
      }

      // 6. توليد الإجابة
      const aiResponse = await aiProvider.generateCompletion(
        prompt,
        'question_auto_answer',
        context.locationId,
      )

      // 7. حساب درجة الثقة
      const confidence = this.calculateConfidence(
        aiResponse.content,
        category,
        relevantInfo,
        context.question,
      )

      const processingTime = Date.now() - startTime

      console.log('[AI Q&A] Answer generated successfully:', {
        category,
        confidence,
        processingTime,
        tokensUsed: aiResponse.usage?.total_tokens,
      })

      return {
        answer: aiResponse.content,
        confidence,
        category,
        provider: preferredProvider,
        model: 'AI-generated',
        processingTime,
        tokensUsed: aiResponse.usage?.total_tokens,
        contextUsed: relevantInfo,
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error('[AI Q&A Service] Error generating answer:', err)
      console.error('[AI Q&A Service] Error details:', {
        message: err.message,
        userId: context.userId,
        question: context.question,
      })

      // Re-throw with user-friendly message
      throw new Error(
        err.message || 'Failed to generate answer. Please check your AI configuration.',
      )
    }
  }

  private categorizeQuestion(question: string): QuestionCategory {
    const lowerQuestion = question.toLowerCase()

    // أنماط للتصنيف
    const patterns = {
      hours:
        /ساعات|مفتوح|مغلق|يفتح|يغلق|opening hours|open|close|hours|working hours|متى تفتح|متى تغلق/i,
      location: /موقع|عنوان|مكان|وين|location|address|where|find you|located/i,
      services: /خدمات|تقدم|توفر|services|what do you|offer|provide|do you have/i,
      pricing: /سعر|تكلفة|كم|price|cost|how much|fee|charge/i,
    }

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerQuestion)) {
        return category as QuestionCategory
      }
    }

    return 'general'
  }

  private extractRelevantInfo(
    category: QuestionCategory,
    businessInfo: QuestionContext['businessInfo'],
  ): Record<string, string | number | boolean | undefined | Record<string, unknown> | string[]> {
    const relevantInfo: Record<
      string,
      string | number | boolean | undefined | Record<string, unknown> | string[]
    > = {
      name: businessInfo.name,
      category: businessInfo.category,
    }

    switch (category) {
      case 'hours':
        if (businessInfo.hours) {
          relevantInfo.hours = businessInfo.hours
        }
        break

      case 'location':
        if (businessInfo.location) {
          relevantInfo.location = businessInfo.location
        }
        break

      case 'services':
        if (businessInfo.services) {
          relevantInfo.services = businessInfo.services
        }
        if (businessInfo.description) {
          relevantInfo.description = businessInfo.description
        }
        break

      case 'pricing':
        if (businessInfo.attributes) {
          relevantInfo.attributes = businessInfo.attributes
        }
        break

      case 'general':
        relevantInfo.description = businessInfo.description
        relevantInfo.location = businessInfo.location
        break
    }

    return relevantInfo
  }

  private buildPrompt(
    context: QuestionContext,
    category: QuestionCategory,
    relevantInfo: Record<string, unknown>,
  ): string {
    const { question, language, tone } = context

    // تحديد اللغة
    const isArabic = language === 'ar' || (language === 'auto' && /[\u0600-\u06FF]/.test(question))

    const toneInstructions = {
      professional: isArabic ? 'احترافي ورسمي' : 'professional and formal',
      friendly: isArabic ? 'ودود ومرحب' : 'friendly and welcoming',
      casual: isArabic ? 'عادي وبسيط' : 'casual and simple',
    }

    const basePrompt = isArabic
      ? `أنت مساعد خدمة عملاء ${toneInstructions[tone as keyof typeof toneInstructions] || 'احترافي'} لشركة ${relevantInfo.name || 'شركتنا'}.`
      : `You are a ${toneInstructions[tone as keyof typeof toneInstructions] || 'professional'} customer service assistant for ${relevantInfo.name || 'our business'}.`

    let contextInfo = ''
    if (Object.keys(relevantInfo).length > 1) {
      contextInfo = isArabic
        ? '\n\nمعلومات الشركة:\n' + JSON.stringify(relevantInfo, null, 2)
        : '\n\nBusiness Information:\n' + JSON.stringify(relevantInfo, null, 2)
    }

    const instructions = isArabic
      ? `\n\nتعليمات:
- أجب على السؤال بدقة وإيجاز
- استخدم المعلومات المتوفرة فقط
- إذا لم تكن المعلومات متوفرة، اعتذر بأدب واقترح الاتصال مباشرة
- لا تختلق معلومات
- اجعل الإجابة في 2-3 جمل كحد أقصى
- أضف اسم الشركة في الإجابة إن أمكن`
      : `\n\nInstructions:
- Answer the question accurately and concisely
- Use only the provided information
- If information is not available, politely apologize and suggest contacting directly
- Do not make up information
- Keep the answer to 2-3 sentences maximum
- Include the business name in the answer if possible`

    const questionPrompt = isArabic
      ? `\n\nالسؤال: ${question}\n\nالإجابة:`
      : `\n\nQuestion: ${question}\n\nAnswer:`

    return basePrompt + contextInfo + instructions + questionPrompt
  }

  private calculateConfidence(
    answer: string,
    category: QuestionCategory,
    info: Record<string, unknown>,
    _question: string,
  ): number {
    let confidence = 50 // قاعدة الثقة

    // معايير رفع الثقة
    // 1. الفئة محددة (ليست عامة)
    if (category !== 'general') {
      confidence += 15
    }

    // 2. المعلومات متوفرة
    const infoKeys = Object.keys(info).filter((k) => k !== 'name' && k !== 'category')
    if (infoKeys.length > 0) {
      confidence += 20
    }

    // 3. طول الإجابة معقول
    if (answer.length > 30 && answer.length < 300) {
      confidence += 10
    }

    // 4. الإجابة لا تحتوي على كلمات تدل على عدم اليقين
    const uncertaintyWords = [
      'may',
      'might',
      'perhaps',
      'possibly',
      'probably',
      'قد',
      'ربما',
      'محتمل',
      'ممكن',
    ]
    const hasUncertainty = uncertaintyWords.some((word) => answer.toLowerCase().includes(word))
    if (!hasUncertainty) {
      confidence += 10
    }

    // 5. الإجابة تحتوي على معلومات محددة (أرقام، عناوين، إلخ)
    const hasSpecificInfo = /\d|street|st\.|avenue|ave\.|road|rd\.|شارع|طريق/.test(
      answer.toLowerCase(),
    )
    if (hasSpecificInfo) {
      confidence += 10
    }

    // معايير خفض الثقة
    // 1. لا توجد معلومات ذات صلة
    if (infoKeys.length === 0) {
      confidence -= 25
    }

    // 2. الإجابة قصيرة جداً
    if (answer.length < 20) {
      confidence -= 15
    }

    // 3. الإجابة تحتوي على اعتذار صريح
    const hasApology = /sorry|unfortunately|don't have|لا نملك|عذراً|للأسف/.test(
      answer.toLowerCase(),
    )
    if (hasApology) {
      confidence -= 20
    }

    // 4. الفئة عامة والمعلومات محدودة
    if (category === 'general' && infoKeys.length < 2) {
      confidence -= 15
    }

    // التأكد من أن الثقة في النطاق 0-100
    return Math.max(0, Math.min(100, confidence))
  }

  // دالة مساعدة لاختبار التصنيف
  public testCategorization(question: string): QuestionCategory {
    return this.categorizeQuestion(question)
  }

  // دالة مساعدة لحساب الثقة بدون توليد إجابة
  public testConfidence(
    answer: string,
    category: QuestionCategory,
    hasRelevantInfo: boolean,
    question: string,
  ): number {
    const mockInfo = hasRelevantInfo ? { data: 'test' } : {}
    return this.calculateConfidence(answer, category, mockInfo, question)
  }
}

// Export singleton instance
export const aiQuestionService = new AIQuestionAnswerService()
