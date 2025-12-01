import { createClient } from "@/lib/supabase/client";
import { aiLogger } from "@/lib/utils/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Schema for post generation
const PostContentSchema = z.object({
  title: z.string(),
  content: z.string(),
  callToAction: z
    .object({
      text: z.string(),
      type: z.enum([
        "LEARN_MORE",
        "CALL",
        "BOOK",
        "ORDER_ONLINE",
        "SIGN_UP",
        "GET_OFFER",
      ]),
    })
    .optional(),
  hashtags: z.array(z.string()).optional(),
  tone: z.enum(["professional", "friendly", "casual", "urgent", "promotional"]),
  keywords: z.array(z.string()),
});

export type PostContent = z.infer<typeof PostContentSchema>;

interface BrandProfile {
  brandName: string;
  brandVoice?: string;
  toneOfVoice?: "professional" | "friendly" | "casual" | "formal";
  brandPersonality?: string;
  targetAudience?: string;
  uniqueSellingPoints?: string[];
  brandValues?: string[];
  preferredPhrases?: string[];
  avoidPhrases?: string[];
}

interface PostGenerationOptions {
  type: "WHAT_NEW" | "EVENT" | "OFFER" | "PRODUCT";
  topic: string;
  details?: string;
  eventDate?: Date;
  offerDetails?: {
    discount?: string;
    validUntil?: Date;
    terms?: string;
  };
  targetLength?: "short" | "medium" | "long";
  includeEmojis?: boolean;
  includeHashtags?: boolean;
  language?: string;
}

export class AIContentGenerationService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private brandProfileCache: Map<string, BrandProfile> = new Map();

  constructor() {
    if (process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY,
      );
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }
  }

  /**
   * Generate post content with brand voice
   */
  async generatePost(
    options: PostGenerationOptions,
    brandProfile: BrandProfile,
  ): Promise<PostContent> {
    if (!this.model) {
      // Fallback to template-based generation
      return this.templateBasedGeneration(options, brandProfile);
    }

    try {
      const prompt = this.buildPrompt(options, brandProfile);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse and validate response
      const parsed = this.parseGeneratedContent(text, options);
      return this.applyBrandVoiceRefinements(parsed, brandProfile);
    } catch (error) {
      aiLogger.error(
        "AI generation failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      return this.templateBasedGeneration(options, brandProfile);
    }
  }

  /**
   * Generate multiple variations of a post
   */
  async generateVariations(
    options: PostGenerationOptions,
    brandProfile: BrandProfile,
    count: number = 3,
  ): Promise<PostContent[]> {
    const variations: PostContent[] = [];

    // Generate variations with different tones
    const tones: Array<"professional" | "friendly" | "casual"> = [
      "professional",
      "friendly",
      "casual",
    ];

    for (let i = 0; i < count; i++) {
      const variation = await this.generatePost(
        {
          ...options,
          // Rotate through tones for variety
          includeEmojis: i % 2 === 0,
          targetLength: ["short", "medium", "long"][i % 3] as any,
        },
        {
          ...brandProfile,
          toneOfVoice: tones[i % tones.length],
        },
      );

      variations.push(variation);
    }

    return variations;
  }

  /**
   * Optimize existing content for brand voice
   */
  async optimizeContent(
    content: string,
    brandProfile: BrandProfile,
  ): Promise<string> {
    if (!this.model) {
      return this.applyBrandVoiceManually(content, brandProfile);
    }

    try {
      const prompt = `
Optimize this content to match the brand voice:

Current Content: "${content}"

Brand Profile:
- Brand: ${brandProfile.brandName}
- Voice: ${brandProfile.brandVoice || "Professional and engaging"}
- Tone: ${brandProfile.toneOfVoice || "professional"}
- Personality: ${brandProfile.brandPersonality || "Helpful and trustworthy"}
- Target Audience: ${brandProfile.targetAudience || "General public"}

Instructions:
1. Rewrite to match brand voice
2. Maintain the core message
3. Use preferred phrases: ${brandProfile.preferredPhrases?.join(", ") || "none specified"}
4. Avoid: ${brandProfile.avoidPhrases?.join(", ") || "none specified"}
5. Keep length similar
6. Make it engaging for the target audience

Optimized content:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      aiLogger.error(
        "Content optimization failed",
        error instanceof Error ? error : new Error(String(error)),
      );
      return this.applyBrandVoiceManually(content, brandProfile);
    }
  }

  /**
   * Analyze content for brand voice consistency
   */
  async analyzeContent(
    content: string,
    brandProfile: BrandProfile,
  ): Promise<{
    score: number;
    suggestions: string[];
    tone: string;
    readability: string;
  }> {
    const analysis = {
      score: 0,
      suggestions: [] as string[],
      tone: "neutral",
      readability: "moderate",
    };

    // Check for brand voice elements
    if (brandProfile.preferredPhrases) {
      const usedPhrases = brandProfile.preferredPhrases.filter((phrase) =>
        content.toLowerCase().includes(phrase.toLowerCase()),
      );
      analysis.score += usedPhrases.length * 10;

      if (usedPhrases.length < brandProfile.preferredPhrases.length / 2) {
        analysis.suggestions.push("Consider using more brand-specific phrases");
      }
    }

    // Check for phrases to avoid
    if (brandProfile.avoidPhrases) {
      const avoidedPhrases = brandProfile.avoidPhrases.filter((phrase) =>
        content.toLowerCase().includes(phrase.toLowerCase()),
      );
      analysis.score -= avoidedPhrases.length * 15;

      avoidedPhrases.forEach((phrase) => {
        analysis.suggestions.push(`Remove or replace "${phrase}"`);
      });
    }

    // Analyze tone
    const casualIndicators = ["hey", "cool", "awesome", "!", "wow"];
    const formalIndicators = [
      "therefore",
      "furthermore",
      "regarding",
      "pursuant",
    ];

    const casualCount = casualIndicators.filter((ind) =>
      content.toLowerCase().includes(ind),
    ).length;
    const formalCount = formalIndicators.filter((ind) =>
      content.toLowerCase().includes(ind),
    ).length;

    if (casualCount > formalCount) {
      analysis.tone = "casual";
    } else if (formalCount > casualCount) {
      analysis.tone = "formal";
    } else {
      analysis.tone = "balanced";
    }

    // Check tone match
    if (brandProfile.toneOfVoice === "casual" && analysis.tone !== "casual") {
      analysis.suggestions.push("Make the tone more casual and friendly");
      analysis.score -= 10;
    } else if (
      brandProfile.toneOfVoice === "professional" &&
      analysis.tone === "casual"
    ) {
      analysis.suggestions.push("Make the tone more professional");
      analysis.score -= 10;
    } else {
      analysis.score += 20;
    }

    // Readability check
    const avgWordLength =
      content.split(" ").reduce((sum, word) => sum + word.length, 0) /
      content.split(" ").length;
    if (avgWordLength < 5) {
      analysis.readability = "easy";
    } else if (avgWordLength > 7) {
      analysis.readability = "complex";
      analysis.suggestions.push(
        "Consider using simpler words for better readability",
      );
    } else {
      analysis.readability = "moderate";
    }

    // Ensure score is between 0-100
    analysis.score = Math.max(0, Math.min(100, analysis.score + 50));

    return analysis;
  }

  /**
   * Get brand profile from database
   */
  async loadBrandProfile(userId: string): Promise<BrandProfile> {
    const cached = this.brandProfileCache.get(userId);
    if (cached) return cached;

    const supabase = createClient();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client");
    }
    const { data } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      const profile: BrandProfile = {
        brandName: data.business_name || "Business",
        brandVoice: data.brand_voice,
        toneOfVoice: data.tone_of_voice,
        brandPersonality: data.brand_personality,
        targetAudience: data.target_audience,
        uniqueSellingPoints: data.unique_selling_points,
        brandValues: data.brand_values,
        preferredPhrases: data.preferred_phrases,
        avoidPhrases: data.avoid_phrases,
      };

      this.brandProfileCache.set(userId, profile);
      return profile;
    }

    // Return default profile
    return {
      brandName: "Your Business",
      toneOfVoice: "professional",
    };
  }

  private buildPrompt(
    options: PostGenerationOptions,
    brandProfile: BrandProfile,
  ): string {
    const lengthGuide = {
      short: "50-100 words",
      medium: "100-200 words",
      long: "200-300 words",
    };

    const basePrompt = `
Create a Google My Business post for ${brandProfile.brandName}.

Post Type: ${options.type}
Topic: ${options.topic}
${options.details ? `Additional Details: ${options.details}` : ""}
${options.eventDate ? `Event Date: ${options.eventDate.toLocaleDateString()}` : ""}
${options.offerDetails ? `Offer: ${options.offerDetails.discount}, Valid until: ${options.offerDetails.validUntil?.toLocaleDateString()}` : ""}

Brand Profile:
- Voice: ${brandProfile.brandVoice || "Professional and engaging"}
- Tone: ${brandProfile.toneOfVoice || "professional"}
- Personality: ${brandProfile.brandPersonality || "Helpful and trustworthy"}
- Target Audience: ${brandProfile.targetAudience || "General public"}
- Unique Selling Points: ${brandProfile.uniqueSellingPoints?.join(", ") || "Quality service"}
- Values: ${brandProfile.brandValues?.join(", ") || "Customer satisfaction"}

Requirements:
- Length: ${lengthGuide[options.targetLength || "medium"]}
- Include emojis: ${options.includeEmojis ? "Yes, but sparingly" : "No"}
- Include hashtags: ${options.includeHashtags ? "Yes, 3-5 relevant ones" : "No"}
- Language: ${options.language || "English"}
- Must use preferred phrases: ${brandProfile.preferredPhrases?.join(", ") || "none"}
- Must avoid: ${brandProfile.avoidPhrases?.join(", ") || "none"}

Format the response as:
Title: [engaging title]
Content: [main post content]
Call to Action: [action text] | [action type]
Hashtags: [comma separated]
Keywords: [comma separated SEO keywords]`;

    return basePrompt;
  }

  private parseGeneratedContent(
    text: string,
    options: PostGenerationOptions,
  ): PostContent {
    // Try to parse structured response
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const content: Partial<PostContent> = {
      tone: options.type === "OFFER" ? "promotional" : "friendly",
      keywords: [],
    };

    for (const line of lines) {
      if (line.startsWith("Title:")) {
        content.title = line.replace("Title:", "").trim();
      } else if (line.startsWith("Content:")) {
        content.content = line.replace("Content:", "").trim();
      } else if (line.startsWith("Call to Action:")) {
        const ctaParts = line.replace("Call to Action:", "").trim().split("|");
        if (ctaParts.length === 2) {
          content.callToAction = {
            text: ctaParts[0].trim(),
            type: this.mapCTAType(ctaParts[1].trim()),
          };
        }
      } else if (line.startsWith("Hashtags:")) {
        content.hashtags = line
          .replace("Hashtags:", "")
          .trim()
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      } else if (line.startsWith("Keywords:")) {
        content.keywords = line
          .replace("Keywords:", "")
          .trim()
          .split(",")
          .map((kw) => kw.trim())
          .filter(Boolean);
      }
    }

    // Fallback if parsing fails
    if (!content.title || !content.content) {
      content.title = options.topic;
      content.content = text;
    }

    return PostContentSchema.parse(content);
  }

  private mapCTAType(
    type: string,
  ): NonNullable<PostContent["callToAction"]>["type"] {
    const mapping: Record<
      string,
      NonNullable<PostContent["callToAction"]>["type"]
    > = {
      learn: "LEARN_MORE",
      call: "CALL",
      book: "BOOK",
      order: "ORDER_ONLINE",
      sign: "SIGN_UP",
      offer: "GET_OFFER",
    };

    const normalized = type.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
      if (normalized.includes(key)) return value;
    }

    return "LEARN_MORE";
  }

  private applyBrandVoiceRefinements(
    content: PostContent,
    brandProfile: BrandProfile,
  ): PostContent {
    // Apply brand-specific adjustments
    if (
      brandProfile.preferredPhrases &&
      brandProfile.preferredPhrases.length > 0
    ) {
      // Try to incorporate at least one preferred phrase
      const phrase = brandProfile.preferredPhrases[0];
      if (!content.content.toLowerCase().includes(phrase.toLowerCase())) {
        content.content = `${content.content} ${phrase}`;
      }
    }

    // Ensure avoid phrases are not present
    if (brandProfile.avoidPhrases) {
      for (const avoidPhrase of brandProfile.avoidPhrases) {
        const regex = new RegExp(avoidPhrase, "gi");
        content.content = content.content.replace(regex, "");
        if (content.title) {
          content.title = content.title.replace(regex, "");
        }
      }
    }

    return content;
  }

  private templateBasedGeneration(
    options: PostGenerationOptions,
    brandProfile: BrandProfile,
  ): PostContent {
    const templates = {
      WHAT_NEW: {
        title: `🆕 ${options.topic}`,
        content: `We're excited to share ${options.topic}! ${options.details || ""} Visit us to learn more about what makes ${brandProfile.brandName} special.`,
        callToAction: { text: "Learn More", type: "LEARN_MORE" as const },
      },
      EVENT: {
        title: `📅 ${options.topic}`,
        content: `Join us ${options.eventDate ? `on ${options.eventDate.toLocaleDateString()}` : "soon"} for ${options.topic}! ${options.details || ""} Don't miss out!`,
        callToAction: { text: "Book Now", type: "BOOK" as const },
      },
      OFFER: {
        title: `🎉 ${options.topic}`,
        content: `Special offer: ${options.topic}! ${options.offerDetails?.discount || "Great savings"} available ${options.offerDetails?.validUntil ? `until ${options.offerDetails.validUntil.toLocaleDateString()}` : "for a limited time"}. ${options.details || ""}`,
        callToAction: { text: "Get Offer", type: "GET_OFFER" as const },
      },
      PRODUCT: {
        title: `✨ ${options.topic}`,
        content: `Discover ${options.topic} at ${brandProfile.brandName}! ${options.details || "Quality you can trust."}`,
        callToAction: { text: "Order Online", type: "ORDER_ONLINE" as const },
      },
    };

    const template = templates[options.type];

    return {
      ...template,
      tone: (brandProfile.toneOfVoice || "professional") as
        | "professional"
        | "friendly"
        | "casual"
        | "urgent"
        | "promotional",
      keywords: [
        options.topic,
        brandProfile.brandName,
        options.type.toLowerCase(),
      ],
      hashtags: options.includeHashtags
        ? [
            `#${brandProfile.brandName.replace(/\s+/g, "")}`,
            `#${options.type.toLowerCase()}`,
            "#googlemybusiness",
          ]
        : undefined,
    };
  }

  private applyBrandVoiceManually(
    content: string,
    brandProfile: BrandProfile,
  ): string {
    let optimized = content;

    // Apply tone adjustments
    if (brandProfile.toneOfVoice === "casual") {
      optimized = optimized
        .replace(/We are pleased to/gi, "We're excited to")
        .replace(/Thank you/gi, "Thanks")
        .replace(/Please/gi, "Feel free to");
    } else if (brandProfile.toneOfVoice === "professional") {
      optimized = optimized
        .replace(/We're/gi, "We are")
        .replace(/Thanks/gi, "Thank you")
        .replace(/Feel free to/gi, "Please");
    }

    // Add brand name if not present
    if (!optimized.includes(brandProfile.brandName)) {
      optimized = `${optimized} - ${brandProfile.brandName}`;
    }

    return optimized;
  }
}

// Export singleton instance
export const aiContentService = new AIContentGenerationService();
