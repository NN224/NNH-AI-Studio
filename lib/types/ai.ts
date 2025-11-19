export type AIProvider = 'gemini' | 'anthropic' | 'openai' | 'groq' | 'deepseek';
export type AIModel = string;

export interface QuestionContext {
  question: string;
  businessInfo: {
    name: string;
    category: string;
    description?: string;
    hours?: BusinessHours;
    services?: string[];
    attributes?: Record<string, any>;
    location?: {
      address: string;
      phone?: string;
      website?: string;
    };
  };
  previousQuestions?: Array<{
    question: string;
    answer: string;
  }>;
  language: 'ar' | 'en' | 'auto';
  tone: string;
}

export interface AnswerResult {
  text: string;
  confidence: number;
  category: QuestionCategory;
  provider: AIProvider;
  processingTime: number;
}

export type QuestionCategory = 'hours' | 'location' | 'services' | 'pricing' | 'general';

export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
  };
}
