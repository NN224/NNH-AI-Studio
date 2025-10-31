"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Copy, Download, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface ContentGeneratorProps {
  contentType: string
}

const tones = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "enthusiastic", label: "Enthusiastic" },
]

const providers = [
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "together", label: "Together AI" },
  { value: "openai", label: "OpenAI GPT-4" },
]

export function ContentGenerator({ contentType }: ContentGeneratorProps) {
  const [prompt, setPrompt] = useState("")
  const [tone, setTone] = useState("professional")
  const [provider, setProvider] = useState("groq")
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState("")
  const [copied, setCopied] = useState(false)
  const [usedProvider, setUsedProvider] = useState("")

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setGenerating(true)
    setGeneratedContent("")

    const generatePromise = fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        tone,
        contentType,
        provider,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        
        if (res.status === 401) {
          window.location.href = "/auth/login"
          throw new Error("Please log in to continue")
        }
        
        if (res.status === 400) {
          throw new Error(errorData.error || "Invalid request")
        }
        
        if (res.status === 500) {
          throw new Error(errorData.error || "Server error occurred")
        }
        
        throw new Error(errorData.error || "Failed to generate content")
      }
      return res.json()
    }).catch((err) => {
      if (err.message) throw err
      throw new Error("Connection failed. Please check your internet connection.")
    })

    toast.promise(generatePromise, {
      loading: "Generating content with AI...",
      success: (data) => {
        setGeneratedContent(data.content)
        setUsedProvider(data.provider)
        return `Content generated successfully using ${data.provider}!`
      },
      error: (err) => {
        return err.message || "Failed to generate content"
      },
      finally: () => {
        setGenerating(false)
      },
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    toast.success("Content copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${contentType}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Content downloaded successfully!")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Section */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">AI Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-secondary border-primary/30 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/30">
                {providers.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tone Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">Tone & Style</Label>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <Badge
                  key={t.value}
                  variant={tone === t.value ? "default" : "outline"}
                  className={
                    tone === t.value
                      ? "bg-gradient-to-r from-primary to-accent text-white cursor-pointer"
                      : "border-primary/30 text-muted-foreground cursor-pointer hover:border-primary/50"
                  }
                  onClick={() => setTone(t.value)}
                >
                  {t.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label className="text-foreground">Your Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe what you want to create for ${contentType}...`}
              className="bg-secondary border-primary/30 text-foreground resize-none min-h-[200px]"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output Section */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Generated Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse" />
                <p className="text-muted-foreground">Generating your content...</p>
              </motion.div>
            ) : generatedContent ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-lg bg-secondary border border-primary/20 min-h-[200px]">
                  <p className="text-foreground whitespace-pre-wrap">{generatedContent}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="flex-1 border-primary/30 text-foreground hover:bg-primary/20 bg-transparent"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="flex-1 border-primary/30 text-foreground hover:bg-primary/20 bg-transparent"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    variant="outline"
                    className="flex-1 border-primary/30 text-foreground hover:bg-primary/20 bg-transparent"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Your generated content will appear here</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
