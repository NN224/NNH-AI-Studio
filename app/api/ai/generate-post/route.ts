import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type GenerateBody = {
  platform: 'gmb' | 'youtube'
  prompt?: string
  tone?: 'neutral' | 'friendly' | 'professional' | 'energetic'
  keywords?: string[]
}

const fallbackGenerate = (platform: 'gmb' | 'youtube', prompt: string, tone: string) => {
  const now = new Date().toISOString().slice(0, 10)
  if (platform === 'youtube') {
    return {
      title: `New Video: ${prompt || 'Practical Tips'} (${now})`,
      description:
        `In this video, we cover ${prompt || 'actionable tips'} to help you get results faster.\n\nChapters:\n0:00 Intro\n0:30 Key Idea\n2:00 Demo\n4:30 Best Practices\n\nIf you found this helpful, like and subscribe!`,
      hashtags: '#NNH #AI #YouTube',
    }
  }
  return {
    title: `Weekly Update — ${now}`,
    description:
      `Stay tuned for our latest updates: ${prompt || 'new offers, tips, and local news'}.\n\nVisit us for more details and feel free to reach out!`,
    hashtags: '#GoogleBusiness #Local #Update',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateBody
    const platform = body.platform || 'gmb'
    const prompt = body.prompt?.slice(0, 500) || ''
    const tone = body.tone || 'neutral'

    // If no provider keys configured, return fallback content
    const hasProvider = !!(process.env.OPENAI_API_KEY || process.env.TOGETHER_API_KEY || process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY)
    if (!hasProvider) {
      return NextResponse.json(fallbackGenerate(platform, prompt, tone), { status: 200 })
    }

    // Minimal OpenAI-compatible call (works with OpenAI/Together in production env)
    const apiBase = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const apiKey = process.env.OPENAI_API_KEY || process.env.TOGETHER_API_KEY || process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY
    const model = process.env.AI_MODEL || 'gpt-4o-mini'

    const system = platform === 'youtube'
      ? 'You are an expert YouTube content strategist. Generate compelling video titles and descriptions with clear structure, CTAs, and 3-6 concise hashtags.'
      : 'You are a local marketing expert for Google Business Profile posts. Generate short, engaging business updates with CTA and 3-6 concise hashtags.'

    const userPrompt = `Tone: ${tone}.\nContext: ${prompt || 'general update'}.\nReturn JSON with fields: title, description, hashtags (string). No markdown.`

    const res = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    })

    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json(fallbackGenerate(platform, prompt, tone), { status: 200 })
    }
    let data: any
    try { data = JSON.parse(text) } catch {
      return NextResponse.json(fallbackGenerate(platform, prompt, tone), { status: 200 })
    }
    const content = data?.choices?.[0]?.message?.content || ''
    // Try to parse JSON from the model
    let parsed: any
    try { parsed = JSON.parse(content) } catch {
      parsed = fallbackGenerate(platform, prompt, tone)
    }
    return NextResponse.json(parsed, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to generate' }, { status: 500 })
  }
}


