// claudeClient.js - FIXED VERSION
import Anthropic from "@anthropic-ai/sdk";

/**
 * Get API key from environment
 */
function getApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment!');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('ANTHROP')));
    throw new Error('ANTHROPIC_API_KEY is required but not found in environment variables');
  }

  // Validate API key format
  if (!apiKey.startsWith('sk-ant-')) {
    console.error('❌ Invalid API key format!');
    console.error('API key should start with: sk-ant-');
    console.error('Current key starts with:', apiKey.substring(0, 10) + '...');
    throw new Error('Invalid ANTHROPIC_API_KEY format');
  }

  console.log('✅ API Key loaded (length:', apiKey.length, ')');
  return apiKey;
}

/**
 * Initialize Claude client
 */
const client = new Anthropic({
  apiKey: getApiKey(),
});

/**
 * Analyze code with Claude
 */
export async function analyzeCodeWithClaude(prompt) {
  try {
    console.log('📤 Sending to Claude...');
    console.log('📊 Prompt length:', prompt.length, 'characters');

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", // Updated model
      max_tokens: 8096,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = response.content[0]?.text || "";

    console.log('📥 Response received');
    console.log('📊 Response length:', text.length, 'characters');
    console.log('📊 Tokens used:', response.usage);

    return { 
      success: true, 
      text,
      usage: response.usage
    };

  } catch (error) {
    console.error("❌ Claude API Error:", error.message);
    console.error("Error type:", error.constructor.name);
    console.error("Error status:", error.status);

    if (error.status === 401) {
      console.error("\n🔑 Authentication Error!");
      console.error("The API key is invalid or not properly set.");
      console.error("Please check:");
      console.error("1. API key is correct in Replit Secrets");
      console.error("2. API key starts with 'sk-ant-'");
      console.error("3. Replit has been restarted after adding the secret");
    }

    return { 
      success: false, 
      error: error.message,
      status: error.status
    };
  }
}