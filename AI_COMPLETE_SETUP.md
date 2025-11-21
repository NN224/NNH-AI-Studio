# 🚀 AI Command Center - Complete Setup

## Features Restored

### 1. Auto-Sync System ✅

- Auto-fetch on mount for all users
- Auto-refresh every 30 seconds
- First-time user detection
- Sync on window focus return
- Online/offline detection

### 2. Dynamic System Prompts ✅

- Industry-specific templates (6 industries)
- Multi-language support (EN/AR/Mixed)
- Context-aware responses
- Tone customization
- Scenario handling (crisis, promotion, etc.)

### 3. AI Provider Integration ✅

- OpenAI GPT-4
- Anthropic Claude 3
- Groq Mixtral
- DeepSeek

### 4. Components ✅

- AI Provider Selector
- Custom Prompts Manager
- Enhanced AI Chat
- Auto-sync indicators

## File Structure

```
lib/ai/
  └── system-prompt-builder.ts      # Dynamic prompt system

app/api/ai/
  ├── chat/
  │   └── enhanced/route.ts        # Enhanced chat API
  └── actions/route.ts             # AI actions API

components/ai-command-center/
  ├── ai/
  │   └── ai-provider-selector.tsx # Provider selection UI
  └── prompts/
      └── custom-prompts-manager.tsx # Prompts manager UI

hooks/
  └── use-ai-command-center-v2.ts  # Auto-sync hook
```

## Environment Variables

```env
# AI Providers
SYSTEM_OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
```

## Usage

### Basic Chat

```typescript
const response = await fetch("/api/ai/chat", {
  method: "POST",
  body: JSON.stringify({ message: "Hello" }),
});
```

### Enhanced Chat with Context

```typescript
const response = await fetch("/api/ai/chat/enhanced", {
  method: "POST",
  body: JSON.stringify({
    message: "Customer complained about service",
    businessInfo: { name: "Restaurant", category: "Food" },
    action: "review_response",
    tone: "professional",
    scenario: "complaint",
  }),
});
```

## Testing

1. Start dev server: `npm run dev`
2. Visit: http://localhost:5050/ai-command-center
3. Check auto-sync is working
4. Test AI chat functionality
