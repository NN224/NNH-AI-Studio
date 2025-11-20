/**
 * ML-based sentiment analysis service
 * Uses AI providers for accurate sentiment detection
 */

import { GMBReview } from '@/lib/types/database';

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // 0-1 confidence score
  aspects: {
    service?: number;
    quality?: number;
    price?: number;
    cleanliness?: number;
    atmosphere?: number;
  };
  emotions: {
    joy?: number;
    anger?: number;
    sadness?: number;
    surprise?: number;
    trust?: number;
  };
  keywords: string[];
  topics: Array<{
    topic: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    relevance: number;
  }>;
}

export interface BatchSentimentRequest {
  reviews: Array<{
    id: string;
    text: string;
    rating?: number;
  }>;
}

export interface SentimentStats {
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;
  averageScore: number;
  topPositiveAspects: string[];
  topNegativeAspects: string[];
  emotionBreakdown: Record<string, number>;
}

/**
 * ML Sentiment Analysis Service
 */
export class MLSentimentService {
  private static instance: MLSentimentService;
  private apiKey: string;
  private apiProvider: 'openai' | 'anthropic' | 'google' | 'huggingface';

  private constructor() {
    // Determine which API to use based on environment variables
    if (process.env.OPENAI_API_KEY) {
      this.apiKey = process.env.OPENAI_API_KEY;
      this.apiProvider = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.apiKey = process.env.ANTHROPIC_API_KEY;
      this.apiProvider = 'anthropic';
    } else if (process.env.GOOGLE_API_KEY) {
      this.apiKey = process.env.GOOGLE_API_KEY;
      this.apiProvider = 'google';
    } else if (process.env.HUGGINGFACE_API_KEY) {
      this.apiKey = process.env.HUGGINGFACE_API_KEY;
      this.apiProvider = 'huggingface';
    } else {
      // Fallback to basic sentiment analysis when no API key is configured
      console.warn('No ML API key configured for sentiment analysis - using basic analysis');
      this.apiKey = '';
      this.apiProvider = 'openai'; // Default to prevent errors
    }
  }

  static getInstance(): MLSentimentService {
    if (!MLSentimentService.instance) {
      MLSentimentService.instance = new MLSentimentService();
    }
    return MLSentimentService.instance;
  }

  /**
   * Analyze sentiment of a single review
   */
  async analyzeSentiment(text: string, rating?: number): Promise<SentimentAnalysisResult> {
    // If no API key configured, return basic sentiment based on rating
    if (!this.apiKey) {
      return this.fallbackAnalysis(text, rating);
    }
    
    try {
      switch (this.apiProvider) {
        case 'openai':
          return await this.analyzeWithOpenAI(text, rating);
        case 'anthropic':
          return await this.analyzeWithAnthropic(text, rating);
        case 'google':
          return await this.analyzeWithGoogle(text, rating);
        case 'huggingface':
          return await this.analyzeWithHuggingFace(text, rating);
        default:
          throw new Error('Invalid API provider');
      }
    } catch (error) {
      console.error('ML sentiment analysis failed, falling back to basic analysis:', error);
      return this.fallbackAnalysis(text, rating);
    }
  }

  /**
   * Batch analyze multiple reviews
   */
  async analyzeBatch(reviews: Array<{ id: string; text: string; rating?: number }>): Promise<Map<string, SentimentAnalysisResult>> {
    const results = new Map<string, SentimentAnalysisResult>();
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize);
      const batchPromises = batch.map(review => 
        this.analyzeSentiment(review.text, review.rating)
          .then(result => ({ id: review.id, result }))
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.id, result.value.result);
        } else {
          // Use fallback for failed analyses
          const review = batch[index];
          results.set(review.id, this.fallbackAnalysis(review.text, review.rating));
        }
      });
    }
    
    return results;
  }

  /**
   * Analyze sentiment using OpenAI GPT
   */
  private async analyzeWithOpenAI(text: string, rating?: number): Promise<SentimentAnalysisResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analysis expert. Analyze the given review and return a JSON object with:
            - sentiment: 'positive', 'negative', 'neutral', or 'mixed'
            - score: confidence score between 0 and 1
            - aspects: ratings (0-1) for service, quality, price, cleanliness, atmosphere (if mentioned)
            - emotions: scores (0-1) for joy, anger, sadness, surprise, trust
            - keywords: array of important keywords
            - topics: array of {topic, sentiment, relevance} objects`
          },
          {
            role: 'user',
            content: `Review: "${text}"${rating ? ` Rating: ${rating}/5` : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch {
      // If JSON parsing fails, extract key information
      return this.parseTextResponse(content, text, rating);
    }
  }

  /**
   * Analyze sentiment using Anthropic Claude
   */
  private async analyzeWithAnthropic(text: string, rating?: number): Promise<SentimentAnalysisResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Analyze this review for sentiment. Return JSON with sentiment (positive/negative/neutral/mixed), confidence score (0-1), aspect ratings, emotions, keywords, and topics.
          
          Review: "${text}"${rating ? ` Rating: ${rating}/5` : ''}`
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    try {
      return JSON.parse(content);
    } catch {
      return this.parseTextResponse(content, text, rating);
    }
  }

  /**
   * Analyze sentiment using Google's Natural Language API
   */
  private async analyzeWithGoogle(text: string, rating?: number): Promise<SentimentAnalysisResult> {
    // Google Natural Language API
    const response = await fetch(`https://language.googleapis.com/v1/documents:analyzeSentiment?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: {
          type: 'PLAIN_TEXT',
          content: text,
        },
        encodingType: 'UTF8',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert Google's format to our format
    const sentiment = data.documentSentiment;
    const sentimentCategory = 
      sentiment.score > 0.25 ? 'positive' :
      sentiment.score < -0.25 ? 'negative' : 'neutral';

    // Extract entities as topics
    const entitiesResponse = await fetch(`https://language.googleapis.com/v1/documents:analyzeEntities?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: {
          type: 'PLAIN_TEXT',
          content: text,
        },
        encodingType: 'UTF8',
      }),
    });

    const entitiesData = await entitiesResponse.json();
    const topics = entitiesData.entities?.map((entity: any) => ({
      topic: entity.name,
      sentiment: sentimentCategory,
      relevance: entity.salience,
    })) || [];

    return {
      sentiment: sentimentCategory,
      score: Math.abs(sentiment.score),
      aspects: this.inferAspects(text),
      emotions: this.inferEmotions(text, sentiment.score),
      keywords: this.extractKeywords(text),
      topics,
    };
  }

  /**
   * Analyze sentiment using HuggingFace models
   */
  private async analyzeWithHuggingFace(text: string, rating?: number): Promise<SentimentAnalysisResult> {
    const response = await fetch('https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-sentiment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert HuggingFace output to our format
    const sentimentMap: Record<string, 'positive' | 'negative' | 'neutral'> = {
      '5 stars': 'positive',
      '4 stars': 'positive',
      '3 stars': 'neutral',
      '2 stars': 'negative',
      '1 star': 'negative',
    };

    const topLabel = data[0].reduce((max: any, curr: any) => 
      curr.score > max.score ? curr : max
    );

    return {
      sentiment: sentimentMap[topLabel.label] || 'neutral',
      score: topLabel.score,
      aspects: this.inferAspects(text),
      emotions: this.inferEmotions(text),
      keywords: this.extractKeywords(text),
      topics: this.extractTopics(text),
    };
  }

  /**
   * Fallback analysis when ML services fail
   */
  private fallbackAnalysis(text: string, rating?: number): SentimentAnalysisResult {
    const lowerText = text.toLowerCase();
    
    // Enhanced keyword lists
    const positivePatterns = [
      /excell?ent/i, /great/i, /amazing/i, /wonderful/i, /fantastic/i,
      /love/i, /best/i, /perfect/i, /outstanding/i, /awesome/i,
      /highly recommend/i, /will return/i, /exceeded expectations/i
    ];
    
    const negativePatterns = [
      /terrible/i, /awful/i, /horrible/i, /worst/i, /bad/i,
      /poor/i, /disappoint/i, /disgusting/i, /rude/i, /slow/i,
      /never again/i, /waste/i, /avoid/i, /unacceptable/i
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    positivePatterns.forEach(pattern => {
      if (pattern.test(text)) positiveScore++;
    });

    negativePatterns.forEach(pattern => {
      if (pattern.test(text)) negativeScore++;
    });

    // Consider rating if available
    if (rating !== undefined) {
      if (rating >= 4) positiveScore += 2;
      else if (rating <= 2) negativeScore += 2;
    }

    let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    let score: number;

    if (positiveScore > 0 && negativeScore > 0) {
      sentiment = 'mixed';
      score = 0.5;
    } else if (positiveScore > negativeScore) {
      sentiment = 'positive';
      score = Math.min(0.9, 0.6 + positiveScore * 0.1);
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';
      score = Math.min(0.9, 0.6 + negativeScore * 0.1);
    } else {
      sentiment = 'neutral';
      score = 0.5;
    }

    return {
      sentiment,
      score,
      aspects: this.inferAspects(text),
      emotions: this.inferEmotions(text),
      keywords: this.extractKeywords(text),
      topics: this.extractTopics(text),
    };
  }

  /**
   * Helper methods for extracting information
   */
  private inferAspects(text: string): SentimentAnalysisResult['aspects'] {
    const lowerText = text.toLowerCase();
    const aspects: SentimentAnalysisResult['aspects'] = {};

    if (/service|staff|employee|waiter|manager/i.test(text)) {
      aspects.service = this.scoreAspect(text, ['friendly', 'helpful', 'professional'], ['rude', 'slow', 'unprofessional']);
    }
    
    if (/quality|fresh|delicious|tasty/i.test(text)) {
      aspects.quality = this.scoreAspect(text, ['excellent', 'great', 'fresh'], ['poor', 'bad', 'stale']);
    }
    
    if (/price|value|expensive|cheap|worth/i.test(text)) {
      aspects.price = this.scoreAspect(text, ['reasonable', 'fair', 'worth'], ['expensive', 'overpriced', 'ripoff']);
    }
    
    if (/clean|hygiene|dirty|spotless/i.test(text)) {
      aspects.cleanliness = this.scoreAspect(text, ['clean', 'spotless', 'hygienic'], ['dirty', 'filthy', 'unsanitary']);
    }
    
    if (/atmosphere|ambiance|environment|decor/i.test(text)) {
      aspects.atmosphere = this.scoreAspect(text, ['nice', 'cozy', 'beautiful'], ['loud', 'uncomfortable', 'cramped']);
    }

    return aspects;
  }

  private scoreAspect(text: string, positiveWords: string[], negativeWords: string[]): number {
    const lowerText = text.toLowerCase();
    let score = 0.5;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.15;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.15;
    });
    
    return Math.max(0, Math.min(1, score));
  }

  private inferEmotions(text: string, sentimentScore?: number): SentimentAnalysisResult['emotions'] {
    const emotions: SentimentAnalysisResult['emotions'] = {};
    const lowerText = text.toLowerCase();

    if (/happy|joy|pleased|delighted|love/i.test(text)) {
      emotions.joy = 0.7 + Math.random() * 0.3;
    }
    
    if (/angry|furious|mad|upset/i.test(text)) {
      emotions.anger = 0.7 + Math.random() * 0.3;
    }
    
    if (/sad|disappointed|unhappy/i.test(text)) {
      emotions.sadness = 0.7 + Math.random() * 0.3;
    }
    
    if (/surprised|shocked|unexpected/i.test(text)) {
      emotions.surprise = 0.7 + Math.random() * 0.3;
    }
    
    if (/trust|reliable|confident/i.test(text)) {
      emotions.trust = 0.7 + Math.random() * 0.3;
    }

    return emotions;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what',
      'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every'
    ]);

    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractTopics(text: string): SentimentAnalysisResult['topics'] {
    const topicPatterns = [
      { pattern: /food|meal|dish|cuisine|menu/i, topic: 'Food' },
      { pattern: /service|staff|waiter|employee/i, topic: 'Service' },
      { pattern: /price|cost|value|expensive|cheap/i, topic: 'Pricing' },
      { pattern: /location|parking|access/i, topic: 'Location' },
      { pattern: /atmosphere|ambiance|decor|environment/i, topic: 'Atmosphere' },
      { pattern: /wait|time|quick|slow|fast/i, topic: 'Wait Time' },
      { pattern: /clean|hygiene|dirty/i, topic: 'Cleanliness' },
    ];

    const topics: SentimentAnalysisResult['topics'] = [];
    
    topicPatterns.forEach(({ pattern, topic }) => {
      if (pattern.test(text)) {
        const sentiment = this.getTopicSentiment(text, topic.toLowerCase());
        topics.push({
          topic,
          sentiment,
          relevance: 0.5 + Math.random() * 0.5, // Mock relevance score
        });
      }
    });

    return topics.sort((a, b) => b.relevance - a.relevance);
  }

  private getTopicSentiment(text: string, topic: string): 'positive' | 'negative' | 'neutral' {
    const sentences = text.split(/[.!?]+/);
    const topicSentences = sentences.filter(s => s.toLowerCase().includes(topic));
    
    if (topicSentences.length === 0) return 'neutral';
    
    const sentiment = this.fallbackAnalysis(topicSentences.join('. '));
    return sentiment.sentiment === 'mixed' ? 'neutral' : sentiment.sentiment;
  }

  private parseTextResponse(content: string, originalText: string, rating?: number): SentimentAnalysisResult {
    // Try to extract sentiment from text response
    const sentimentMatch = content.match(/sentiment[:\s]+["']?(positive|negative|neutral|mixed)["']?/i);
    const scoreMatch = content.match(/score[:\s]+([0-9.]+)/i);
    
    return {
      sentiment: (sentimentMatch?.[1] as any) || 'neutral',
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0.5,
      aspects: this.inferAspects(originalText),
      emotions: this.inferEmotions(originalText),
      keywords: this.extractKeywords(originalText),
      topics: this.extractTopics(originalText),
    };
  }

  /**
   * Calculate aggregate sentiment statistics
   */
  static calculateStats(results: SentimentAnalysisResult[]): SentimentStats {
    const counts = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    };
    
    const aspectScores: Record<string, number[]> = {};
    const emotionScores: Record<string, number> = {};
    
    results.forEach(result => {
      counts[result.sentiment]++;
      
      // Aggregate aspects
      Object.entries(result.aspects).forEach(([aspect, score]) => {
        if (!aspectScores[aspect]) aspectScores[aspect] = [];
        aspectScores[aspect].push(score);
      });
      
      // Aggregate emotions
      Object.entries(result.emotions).forEach(([emotion, score]) => {
        emotionScores[emotion] = (emotionScores[emotion] || 0) + score;
      });
    });
    
    const total = results.length || 1;
    
    // Find top positive and negative aspects
    const aspectAverages = Object.entries(aspectScores).map(([aspect, scores]) => ({
      aspect,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));
    
    const topPositiveAspects = aspectAverages
      .filter(a => a.average > 0.6)
      .sort((a, b) => b.average - a.average)
      .map(a => a.aspect);
    
    const topNegativeAspects = aspectAverages
      .filter(a => a.average < 0.4)
      .sort((a, b) => a.average - b.average)
      .map(a => a.aspect);
    
    // Normalize emotion scores
    Object.keys(emotionScores).forEach(emotion => {
      emotionScores[emotion] = emotionScores[emotion] / total;
    });
    
    return {
      positive: Math.round((counts.positive / total) * 100),
      negative: Math.round((counts.negative / total) * 100),
      neutral: Math.round((counts.neutral / total) * 100),
      mixed: Math.round((counts.mixed / total) * 100),
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / total,
      topPositiveAspects,
      topNegativeAspects,
      emotionBreakdown: emotionScores,
    };
  }
}

// Export singleton instance
export const mlSentimentService = MLSentimentService.getInstance();
