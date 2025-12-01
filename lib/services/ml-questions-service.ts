import { aiLogger } from "@/lib/utils/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Schema for question analysis
const QuestionAnalysisSchema = z.object({
  category: z.enum([
    "product",
    "service",
    "hours",
    "location",
    "pricing",
    "availability",
    "general",
  ]),
  intent: z.enum([
    "information",
    "complaint",
    "comparison",
    "recommendation",
    "clarification",
  ]),
  urgency: z.enum(["low", "medium", "high"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  topics: z.array(z.string()),
  suggestedAnswer: z.string(),
  confidence: z.number().min(0).max(1),
  relatedFAQs: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
        relevance: z.number(),
      }),
    )
    .optional(),
});

export type QuestionAnalysis = z.infer<typeof QuestionAnalysisSchema>;

interface BusinessContext {
  businessName: string;
  businessType?: string;
  businessDescription?: string;
  services?: string[];
  policies?: Record<string, string>;
  faqs?: Array<{ question: string; answer: string }>;
}

interface AnswerOptions {
  tone?: "professional" | "friendly" | "casual" | "formal";
  includeCallToAction?: boolean;
  maxLength?: number;
  brandVoice?: string;
}

export class MLQuestionsService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private knowledgeBase: Map<
    string,
    { question: string; answer: string; category: string }
  > = new Map();

  constructor() {
    if (process.env.GOOGLE_AI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }
  }

  /**
   * Analyze a question and generate a suggested answer with ML
   */
  async analyzeQuestion(
    question: string,
    context: BusinessContext,
    options: AnswerOptions = {},
  ): Promise<QuestionAnalysis> {
    if (!this.model) {
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(question, context, options);
    }

    try {
      const prompt = this.buildAnalysisPrompt(question, context, options);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));

      // Validate and enhance with local knowledge
      const validated = QuestionAnalysisSchema.parse(analysis);
      return this.enhanceWithLocalKnowledge(validated, question, context);
    } catch (error) {
      aiLogger.error(
        "ML analysis failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      return this.fallbackAnalysis(question, context, options);
    }
  }

  /**
   * Batch analyze multiple questions for efficiency
   */
  async batchAnalyze(
    questions: Array<{ id: string; text: string }>,
    context: BusinessContext,
    options: AnswerOptions = {},
  ): Promise<Map<string, QuestionAnalysis>> {
    const results = new Map<string, QuestionAnalysis>();

    // Process in batches of 5 for API limits
    const batchSize = 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      const promises = batch.map((q) =>
        this.analyzeQuestion(q.text, context, options).then((analysis) => ({
          id: q.id,
          analysis,
        })),
      );

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ id, analysis }) => {
        results.set(id, analysis);
      });

      // Rate limiting delay
      if (i + batchSize < questions.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Learn from approved answers to improve future suggestions
   */
  async learnFromAnswer(
    question: string,
    approvedAnswer: string,
    category: string,
    effectiveness?: number,
  ): Promise<void> {
    const key = this.generateKnowledgeKey(question);
    this.knowledgeBase.set(key, {
      question,
      answer: approvedAnswer,
      category,
    });

    // TODO: Persist to database for long-term learning
    // This would involve storing in a vector database for similarity search
  }

  /**
   * Generate a confidence score for an answer
   */
  calculateConfidence(
    analysis: QuestionAnalysis,
    context: BusinessContext,
  ): number {
    let confidence = analysis.confidence;

    // Boost confidence if we have related FAQs
    if (analysis.relatedFAQs && analysis.relatedFAQs.length > 0) {
      confidence += 0.1 * Math.min(analysis.relatedFAQs.length, 3);
    }

    // Reduce confidence for sensitive topics
    if (analysis.urgency === "high") {
      confidence *= 0.8;
    }

    // Boost for exact matches in knowledge base
    if (this.hasExactMatch(analysis.suggestedAnswer)) {
      confidence = Math.min(confidence + 0.2, 0.95);
    }

    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  private buildAnalysisPrompt(
    question: string,
    context: BusinessContext,
    options: AnswerOptions,
  ): string {
    const tone = options.tone || "professional";
    const maxLength = options.maxLength || 200;

    return `
Analyze this customer question for ${context.businessName} and provide a suggested answer.

Business Context:
- Name: ${context.businessName}
- Type: ${context.businessType || "General Business"}
- Description: ${context.businessDescription || "Not provided"}
- Services: ${context.services?.join(", ") || "Various services"}

Customer Question: "${question}"

Instructions:
1. Categorize the question (product/service/hours/location/pricing/availability/general)
2. Identify the intent (information/complaint/comparison/recommendation/clarification)
3. Assess urgency (low/medium/high)
4. Determine sentiment (positive/neutral/negative)
5. Extract main topics
6. Generate a ${tone} answer (max ${maxLength} words)
${options.includeCallToAction ? "7. Include a relevant call-to-action" : ""}
${options.brandVoice ? `8. Match this brand voice: ${options.brandVoice}` : ""}

Response format (JSON):
{
  "category": "...",
  "intent": "...",
  "urgency": "...",
  "sentiment": "...",
  "topics": ["topic1", "topic2"],
  "suggestedAnswer": "...",
  "confidence": 0.0-1.0,
  "relatedFAQs": [
    {"question": "...", "answer": "...", "relevance": 0.0-1.0}
  ]
}`;
  }

  private fallbackAnalysis(
    question: string,
    context: BusinessContext,
    options: AnswerOptions,
  ): QuestionAnalysis {
    const lowerQuestion = question.toLowerCase();

    // Simple rule-based categorization
    let category: QuestionAnalysis["category"] = "general";
    if (
      lowerQuestion.includes("hour") ||
      lowerQuestion.includes("open") ||
      lowerQuestion.includes("close")
    ) {
      category = "hours";
    } else if (
      lowerQuestion.includes("price") ||
      lowerQuestion.includes("cost")
    ) {
      category = "pricing";
    } else if (
      lowerQuestion.includes("where") ||
      lowerQuestion.includes("location")
    ) {
      category = "location";
    }

    // Generate basic answer
    const suggestedAnswer = this.generateBasicAnswer(
      question,
      context,
      category,
    );

    return {
      category,
      intent: "information",
      urgency: "medium",
      sentiment: "neutral",
      topics: this.extractTopics(question),
      suggestedAnswer,
      confidence: 0.6,
    };
  }

  private generateBasicAnswer(
    question: string,
    context: BusinessContext,
    category: string,
  ): string {
    const templates = {
      hours: `Thank you for your inquiry about our hours. Please visit our business profile or contact us directly for our current operating hours.`,
      pricing: `Thank you for asking about our pricing. For detailed pricing information, please contact us directly or visit our website.`,
      location: `We're located at [Your Address]. You can find directions and more information on our business profile.`,
      general: `Thank you for your question. We'd be happy to help! Please contact us directly for more information about ${context.businessName}.`,
    };

    return templates[category as keyof typeof templates] || templates.general;
  }

  private extractTopics(question: string): string[] {
    const words = question.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      "the",
      "is",
      "are",
      "what",
      "when",
      "where",
      "how",
      "why",
      "do",
      "does",
      "can",
      "could",
    ]);

    return words
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  private enhanceWithLocalKnowledge(
    analysis: QuestionAnalysis,
    question: string,
    context: BusinessContext,
  ): QuestionAnalysis {
    // Check knowledge base for similar questions
    const similar = this.findSimilarQuestions(question);

    if (similar.length > 0) {
      analysis.relatedFAQs = similar.map((item) => ({
        question: item.question,
        answer: item.answer,
        relevance: this.calculateSimilarity(question, item.question),
      }));

      // Boost confidence if we have good matches
      const maxRelevance = Math.max(
        ...analysis.relatedFAQs.map((f) => f.relevance),
      );
      if (maxRelevance > 0.8) {
        analysis.confidence = Math.min(analysis.confidence + 0.15, 0.95);
      }
    }

    return analysis;
  }

  private generateKnowledgeKey(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");
  }

  private hasExactMatch(answer: string): boolean {
    // Check if answer matches any in knowledge base
    for (const [_, value] of this.knowledgeBase) {
      if (value.answer === answer) return true;
    }
    return false;
  }

  private findSimilarQuestions(
    question: string,
    limit: number = 3,
  ): Array<{ question: string; answer: string; category: string }> {
    // Simple implementation - in production, use vector similarity
    const results: Array<{
      question: string;
      answer: string;
      category: string;
      score: number;
    }> = [];

    for (const [_, value] of this.knowledgeBase) {
      const score = this.calculateSimilarity(question, value.question);
      if (score > 0.5) {
        results.push({ ...value, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

// Export singleton instance
export const mlQuestionsService = new MLQuestionsService();
