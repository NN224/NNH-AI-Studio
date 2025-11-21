export interface SystemPromptConfig {
  businessInfo: BusinessInfo;
  language?: "en" | "ar" | "mixed";
  tone?: "professional" | "friendly" | "casual" | "formal";
  context?: {
    rating?: number;
    totalReviews?: number;
    responseRate?: string;
    commonIssues?: string[];
    strengths?: string[];
  };
  action?: "chat" | "review_response" | "post_creation" | "analysis" | "qa";
}

export interface BusinessInfo {
  name: string;
  category?: string;
  id?: string;
  locationId?: string;
}

const industryTemplates = {
  restaurant: {
    keywords: [
      "food",
      "service",
      "ambiance",
      "delivery",
      "menu",
      "taste",
      "quality",
    ],
    tone: "warm and welcoming",
    priorities: [
      "food quality",
      "customer service",
      "cleanliness",
      "wait times",
    ],
    commonResponses: {
      positive: "Thank you for dining with us! We're delighted you enjoyed",
      negative:
        "We sincerely apologize for your experience. Your feedback about",
      neutral: "Thank you for taking the time to share your thoughts about",
    },
  },
  medical: {
    keywords: [
      "care",
      "treatment",
      "staff",
      "appointment",
      "wait time",
      "professionalism",
    ],
    tone: "professional and empathetic",
    priorities: [
      "patient care",
      "professionalism",
      "wait times",
      "communication",
    ],
    commonResponses: {
      positive: "Thank you for trusting us with your healthcare needs",
      negative: "We take your concerns very seriously and apologize for",
      neutral: "We appreciate your feedback regarding",
    },
  },
  retail: {
    keywords: ["product", "price", "service", "quality", "selection", "staff"],
    tone: "friendly and helpful",
    priorities: [
      "product quality",
      "customer service",
      "pricing",
      "availability",
    ],
    commonResponses: {
      positive: "We're thrilled you had a great shopping experience",
      negative: "We apologize that your visit didn't meet expectations",
      neutral: "Thank you for your valuable feedback about",
    },
  },
  hotel: {
    keywords: [
      "room",
      "service",
      "location",
      "cleanliness",
      "amenities",
      "staff",
    ],
    tone: "hospitable and professional",
    priorities: ["comfort", "cleanliness", "service", "amenities"],
    commonResponses: {
      positive: "We're delighted you enjoyed your stay with us",
      negative: "We sincerely apologize that your stay was not satisfactory",
      neutral: "Thank you for choosing to stay with us and for your feedback",
    },
  },
  automotive: {
    keywords: ["service", "repair", "price", "honesty", "time", "quality"],
    tone: "professional and trustworthy",
    priorities: [
      "service quality",
      "transparency",
      "timeliness",
      "fair pricing",
    ],
    commonResponses: {
      positive: "Thank you for trusting us with your vehicle",
      negative: "We apologize for not meeting your service expectations",
      neutral: "We appreciate your feedback about our service",
    },
  },
  beauty: {
    keywords: [
      "service",
      "style",
      "staff",
      "cleanliness",
      "results",
      "atmosphere",
    ],
    tone: "friendly and personalized",
    priorities: [
      "service quality",
      "customer satisfaction",
      "hygiene",
      "results",
    ],
    commonResponses: {
      positive: "We're so happy you loved your experience",
      negative: "We're sorry to hear you weren't satisfied with",
      neutral: "Thank you for sharing your experience at our salon",
    },
  },
};

function determineBusinessCategory(
  businessInfo: BusinessInfo,
): keyof typeof industryTemplates {
  const category = businessInfo.category?.toLowerCase() || "";

  if (
    category.includes("restaurant") ||
    category.includes("food") ||
    category.includes("cafe")
  ) {
    return "restaurant";
  }
  if (
    category.includes("medical") ||
    category.includes("health") ||
    category.includes("clinic") ||
    category.includes("doctor")
  ) {
    return "medical";
  }
  if (
    category.includes("hotel") ||
    category.includes("accommodation") ||
    category.includes("lodging")
  ) {
    return "hotel";
  }
  if (
    category.includes("automotive") ||
    category.includes("car") ||
    category.includes("mechanic")
  ) {
    return "automotive";
  }
  if (
    category.includes("beauty") ||
    category.includes("salon") ||
    category.includes("spa")
  ) {
    return "beauty";
  }

  return "retail";
}

export function buildSystemPrompt(config: SystemPromptConfig): string {
  const {
    businessInfo,
    language = "en",
    tone = "professional",
    context,
    action = "chat",
  } = config;

  const category = determineBusinessCategory(businessInfo);
  const template = industryTemplates[category];

  const prompts = {
    identity: `You are an AI assistant specialized in Google My Business management for ${businessInfo.name}, a ${businessInfo.category || "business"}.`,

    expertise: `You have deep expertise in:
- Crafting ${template.tone} responses to customer reviews
- Understanding ${category} industry best practices
- Optimizing local SEO and online presence
- Analyzing customer sentiment and feedback patterns
- Creating engaging social media posts
- Managing online reputation`,

    context: context
      ? `
Current Business Context:
- Overall Rating: ${context.rating ? `${context.rating}/5 stars` : "Not specified"}
- Total Reviews: ${context.totalReviews || "Unknown"}
- Response Rate: ${context.responseRate || "Unknown"}
${context.commonIssues?.length ? `- Common Issues: ${context.commonIssues.join(", ")}` : ""}
${context.strengths?.length ? `- Strengths: ${context.strengths.join(", ")}` : ""}`
      : "",

    personality: `Communication Style:
- Tone: ${
      tone === "professional"
        ? "Professional and courteous"
        : tone === "friendly"
          ? "Warm and approachable"
          : tone === "formal"
            ? "Formal and respectful"
            : "Casual and conversational"
    }
- Always maintain the brand voice of ${businessInfo.name}
- Be authentic, empathetic, and solution-oriented
- Never use generic or template-like responses`,

    industry: `Industry-Specific Knowledge for ${category}:
- Key focus areas: ${template.priorities.join(", ")}
- Important keywords: ${template.keywords.join(", ")}
- Response style: ${template.tone}`,

    language:
      language === "ar"
        ? `
- Respond primarily in Arabic
- Use professional Arabic business language
- Be culturally sensitive to Middle Eastern customers`
        : language === "mixed"
          ? `
- You can respond in both English and Arabic
- Match the language of the customer's message
- Use Arabic for Arabic reviews/questions`
          : `- Respond in clear, professional English`,

    guidelines: `
Key Guidelines:
1. NEVER use fake or generic responses - each response must be unique and specific
2. Always acknowledge specific details mentioned by the customer
3. For negative reviews: Apologize sincerely, address specific concerns, offer resolution
4. For positive reviews: Thank genuinely, highlight what they enjoyed, invite them back
5. Keep responses between 50-150 words unless specified otherwise
6. Include a call-to-action when appropriate
7. Never blame the customer or make excuses
8. Show genuine care for customer satisfaction`,
  };

  let systemPrompt = `${prompts.identity}

${prompts.expertise}
${prompts.context}
${prompts.personality}
${prompts.industry}
${prompts.language}
${prompts.guidelines}

Remember: You represent ${businessInfo.name}. Every interaction shapes the business's online reputation.`;

  if (action === "review_response") {
    systemPrompt += `

Specific Task: Crafting Review Responses
- Use appropriate response template as starting point:
  * Positive (4-5 stars): "${template.commonResponses.positive}..."
  * Negative (1-2 stars): "${template.commonResponses.negative}..."
  * Neutral (3 stars): "${template.commonResponses.neutral}..."
- Personalize each response with specific details from the review`;
  }

  return systemPrompt.trim();
}

export function generateScenarioPrompt(
  scenario: "crisis" | "promotion" | "holiday" | "complaint" | "praise",
  businessInfo: BusinessInfo,
): string {
  const scenarios = {
    crisis: `You're handling a crisis situation for ${businessInfo.name}. 
Be extra empathetic, take full responsibility where appropriate, 
offer immediate solutions, and escalate to management when needed.`,

    promotion: `You're promoting a special offer or event for ${businessInfo.name}.
Be enthusiastic but not pushy. Highlight value and benefits.
Create urgency without being aggressive.`,

    holiday: `You're creating holiday-themed content for ${businessInfo.name}.
Be festive and warm. Reference relevant cultural celebrations.`,

    complaint: `You're addressing a serious complaint for ${businessInfo.name}.
Acknowledge the issue immediately. Show genuine concern.
Offer specific steps for resolution.`,

    praise: `You're responding to exceptional praise for ${businessInfo.name}.
Be genuinely grateful. Highlight the team members involved.`,
  };

  return scenarios[scenario] || "";
}

export function getExamplePrompts() {
  return {
    restaurant: buildSystemPrompt({
      businessInfo: {
        name: "Burger Palace",
        category: "Restaurant",
      },
      context: {
        rating: 4.2,
        totalReviews: 234,
        responseRate: "89%",
        commonIssues: ["wait times", "cold food"],
        strengths: ["taste", "portions", "friendly staff"],
      },
      action: "review_response",
    }),
    medical: buildSystemPrompt({
      businessInfo: {
        name: "City Medical Clinic",
        category: "Healthcare",
      },
      language: "ar",
      tone: "formal",
      action: "qa",
    }),
  };
}
