import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, tone, contentType, provider: preferredProvider } = body

    if (!prompt || !tone || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validContentTypes = ['posts', 'responses', 'descriptions', 'faqs']
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }

    let generatedContent = ""
    let usedProvider = ""
    let error = null

    const providers = [
      { name: "groq", key: process.env.GROQ_API_KEY },
      { name: "deepseek", key: process.env.DEEPSEEK_API_KEY },
      { name: "together", key: process.env.TOGETHER_API_KEY },
      { name: "openai", key: process.env.OPENAI_API_KEY },
    ]

    if (preferredProvider) {
      const preferred = providers.find((p) => p.name === preferredProvider)
      if (preferred) {
        providers.unshift(preferred)
      }
    }

    for (const provider of providers) {
      if (!provider.key) continue

      try {
        const result = await generateWithProvider(provider.name, provider.key, prompt, tone, contentType)
        if (result) {
          generatedContent = result
          usedProvider = provider.name
          break
        }
      } catch (err) {
        error = err
        console.log(`Failed with provider: ${provider.name}`)
        continue
      }
    }

    if (!generatedContent) {
      return NextResponse.json(
        { error: "All AI providers are unavailable" },
        { status: 500 }
      )
    }

    const { data: savedContent, error: dbError } = await supabase
      .from("content_generations")
      .insert({
        user_id: user.id,
        content_type: contentType,
        prompt,
        tone,
        provider: usedProvider,
        generated_content: generatedContent,
        metadata: {
          preferredProvider: preferredProvider || null,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError.message)
      return NextResponse.json(
        { 
          error: "Failed to save content" 
        }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      content: generatedContent,
      provider: usedProvider,
      id: savedContent?.id,
    })
  } catch (error) {
    console.error("Error in generate API")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateWithProvider(
  provider: string,
  apiKey: string,
  prompt: string,
  tone: string,
  contentType: string
): Promise<string | null> {
  const systemPrompt = `You are an AI assistant helping to generate ${contentType} content with a ${tone} tone. Generate high-quality, professional content based on the user's prompt.`

  switch (provider) {
    case "groq":
      return await generateWithGroq(apiKey, systemPrompt, prompt)
    case "deepseek":
      return await generateWithDeepSeek(apiKey, systemPrompt, prompt)
    case "together":
      return await generateWithTogether(apiKey, systemPrompt, prompt)
    case "openai":
      return await generateWithOpenAI(apiKey, systemPrompt, prompt)
    default:
      return null
  }
}

async function generateWithGroq(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    return null
  }
}

async function generateWithDeepSeek(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    return null
  }
}

async function generateWithTogether(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`Together API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    return null
  }
}

async function generateWithOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch (error) {
    return null
  }
}
