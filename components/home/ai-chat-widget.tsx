'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  Mic,
  MicOff,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RotateCw,
  Command,
  Zap,
  CheckCircle,
  AlertCircle,
  Link2,
  Image as ImageIcon,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  reactions?: {
    liked?: boolean
    disliked?: boolean
    hearted?: boolean
  }
  attachments?: Array<{
    type: 'image' | 'file' | 'link'
    url: string
    name: string
  }>
  command?: string
  status?: 'sent' | 'delivered' | 'error'
  editedAt?: Date
  context?: {
    page?: string
    action?: string
    data?: any
  }
}

interface SuggestedAction {
  id: string
  label: string
  icon?: React.ElementType
  query: string
  command?: string
  color?: string
}

export function AIChatWidget() {
  const t = useTranslations('home.aiChat')
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t('welcomeMessage'),
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [connectionStatus] = useState<'online' | 'offline' | 'connecting'>('online')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCommands] = useState(false)
  const [multiline] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    ) {
      const SpeechRecognition =
        (window as Window & typeof globalThis).SpeechRecognition ||
        (window as Window & typeof globalThis).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('')

        setInput(transcript)
      }

      recognitionRef.current.onerror = () => {
        setIsRecording(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Get context-aware suggestions based on current page
  const getContextSuggestions = useCallback((): SuggestedAction[] => {
    const baseSuggestions: SuggestedAction[] = [
      {
        id: 'help',
        label: 'How can I help?',
        icon: Sparkles,
        query: 'What can you help me with?',
        color: 'orange',
      },
    ]

    // Add page-specific suggestions
    if (pathname.includes('/reviews')) {
      return [
        ...baseSuggestions,
        {
          id: 'auto-reply',
          label: 'Setup Auto-Reply',
          icon: Zap,
          query: 'Help me setup automatic review replies',
          command: '/auto-reply',
          color: 'yellow',
        },
        {
          id: 'review-template',
          label: 'Review Templates',
          icon: FileText,
          query: 'Show me review reply templates',
          color: 'blue',
        },
      ]
    }

    if (pathname.includes('/analytics')) {
      return [
        ...baseSuggestions,
        {
          id: 'insights',
          label: 'Key Insights',
          icon: AlertCircle,
          query: 'What are my key business insights?',
          command: '/insights',
          color: 'purple',
        },
      ]
    }

    // Default suggestions for home page
    return [
      ...baseSuggestions,
      {
        id: 'reviews',
        label: 'Manage Reviews',
        icon: MessageCircle,
        query: 'How do I respond to reviews?',
        color: 'blue',
      },
      {
        id: 'analytics',
        label: 'View Analytics',
        icon: AlertCircle,
        query: 'Show me my analytics',
        command: '/analytics',
        color: 'green',
      },
    ]
  }, [pathname])

  // Handle voice recording
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Voice input not supported',
        description: "Your browser doesn't support voice input.",
        variant: 'destructive',
      })
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  // Handle file attachment
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Preview logic here
    }
  }

  // Parse commands (e.g., /help, /analytics)
  const parseCommand = (text: string) => {
    if (text.startsWith('/')) {
      const [command, ...args] = text.slice(1).split(' ')
      return { command, args: args.join(' ') }
    }
    return null
  }

  // Handle message reactions
  const handleReaction = (messageId: string, reaction: 'like' | 'dislike' | 'heart') => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || {}
          return {
            ...msg,
            reactions: {
              ...reactions,
              liked: reaction === 'like' ? !reactions.liked : false,
              disliked: reaction === 'dislike' ? !reactions.disliked : false,
              hearted: reaction === 'heart' ? !reactions.hearted : false,
            },
          }
        }
        return msg
      }),
    )
  }

  // Copy message content
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      description: 'Message copied to clipboard',
      duration: 2000,
    })
  }

  // Retry failed message
  const retryMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message && message.role === 'user') {
      handleSend(message.content)
    }
  }

  // Simulate typing indicator
  const showTypingIndicator = () => {
    setIsTyping(true)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }

  const handleSend = async (messageOverride?: string) => {
    const contentToSend = (messageOverride ?? input).trim()
    if (!contentToSend || isLoading) return

    // Check for commands
    const commandData = parseCommand(contentToSend)
    if (commandData) {
      handleCommand(commandData.command, commandData.args)
      setInput('')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: contentToSend,
      timestamp: new Date(),
      status: 'sent',
      context: {
        page: pathname,
        action: 'chat',
      },
      attachments: selectedFile
        ? [
            {
              type: selectedFile.type.startsWith('image/') ? 'image' : 'file',
              url: URL.createObjectURL(selectedFile),
              name: selectedFile.name,
            },
          ]
        : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSelectedFile(null)
    setIsLoading(true)
    showTypingIndicator()

    const conversationHistory = [...messages, userMessage]
      .filter((message) => message.id !== 'welcome')
      .map(({ role, content }) => ({ role, content }))

    try {
      const response = await fetch('/api/ai/chat/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          context: userMessage.context,
          provider: 'openai',
          action: 'chat',
        }),
      })

      const data = response.ok ? await response.json() : null
      const aiContent = data?.message?.content || t('responses.default')
      const aiTimestamp = data?.message?.timestamp ? new Date(data.message.timestamp) : new Date()

      // Update user message status
      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMessage.id ? { ...msg, status: 'delivered' } : msg)),
      )

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: aiTimestamp,
        status: 'delivered',
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)

      // If AI suggests an action, show it
      if (data?.suggestedAction) {
        // Handle suggested action
      }
    } catch (error) {
      console.error('AI chat error:', error)

      // Update message status to error
      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMessage.id ? { ...msg, status: 'error' } : msg)),
      )

      const fallbackMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        status: 'error',
      }
      setMessages((prev) => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  // Handle commands
  const handleCommand = (command: string, args: string) => {
    switch (command) {
      case 'help':
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Available commands:\n/help - Show this message\n/clear - Clear chat history\n/analytics - View your analytics\n/reviews - Manage reviews\n/settings - Open settings`,
            timestamp: new Date(),
            status: 'delivered',
          },
        ])
        break

      case 'clear':
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: t('welcomeMessage'),
            timestamp: new Date(),
            status: 'delivered',
          },
        ])
        toast({
          description: 'Chat history cleared',
        })
        break

      case 'analytics':
        router.push('/analytics')
        setIsOpen(false)
        break

      case 'reviews':
        router.push('/reviews')
        setIsOpen(false)
        break

      case 'settings':
        router.push('/settings')
        setIsOpen(false)
        break

      default:
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Unknown command: /${command}. Type /help for available commands.`,
            timestamp: new Date(),
            status: 'delivered',
          },
        ])
    }
  }

  const quickActions = getContextSuggestions()

  return (
    <>
      {/* Floating Chat Button */}
      <TooltipProvider>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 200 }}
          className="fixed bottom-6 right-6 z-50 ai-chat-button"
        >
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setIsOpen(true)}
                      size="lg"
                      className="ai-chat-button h-14 w-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/50 relative overflow-hidden group"
                    >
                      {/* Pulse animation */}
                      <motion.div
                        className="absolute inset-0 bg-white rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <MessageCircle className="h-6 w-6 relative z-10" />

                      {/* Notification badge with connection status */}
                      <motion.div
                        className={cn(
                          'absolute -top-1 -right-1 h-5 w-5 rounded-full border-2 border-black flex items-center justify-center',
                          connectionStatus === 'online'
                            ? 'bg-green-500'
                            : connectionStatus === 'offline'
                              ? 'bg-red-500'
                              : 'bg-yellow-500',
                        )}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {connectionStatus === 'online' ? (
                          <Sparkles className="h-3 w-3 text-white" />
                        ) : connectionStatus === 'offline' ? (
                          <X className="h-3 w-3 text-white" />
                        ) : (
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                        )}
                      </motion.div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Chat with AI Assistant</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </TooltipProvider>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
          >
            <Card className="border-orange-500/30 bg-black/95 backdrop-blur-xl shadow-2xl shadow-orange-500/20 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Bot className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-white">{t('title')}</h3>
                    <p className="text-xs text-orange-100">{t('subtitle')}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 hover:bg-white/20 text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="h-96 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'assistant' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4 text-orange-500" />
                        ) : (
                          <User className="h-4 w-4 text-blue-500" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}
                      >
                        <div
                          className={cn(
                            'px-4 py-2 rounded-2xl relative group',
                            message.role === 'assistant'
                              ? 'bg-orange-500/10 border border-orange-500/20'
                              : 'bg-blue-500/10 border border-blue-500/20',
                            message.status === 'error' && 'border-red-500/30 bg-red-500/10',
                          )}
                        >
                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {message.attachments.map((attachment, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 p-2 bg-black/20 rounded-lg"
                                >
                                  {attachment.type === 'image' ? (
                                    <ImageIcon className="h-4 w-4" />
                                  ) : attachment.type === 'link' ? (
                                    <Link2 className="h-4 w-4" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  <span className="text-xs truncate">{attachment.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Message content */}
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {message.content}
                          </p>

                          {/* Message actions (show on hover) */}
                          <div className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/90 rounded-lg p-1 border border-gray-700">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => copyMessage(message.content)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy</TooltipContent>
                            </Tooltip>

                            {message.role === 'assistant' && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={cn(
                                        'h-6 w-6',
                                        message.reactions?.liked && 'text-green-500',
                                      )}
                                      onClick={() => handleReaction(message.id, 'like')}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Helpful</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={cn(
                                        'h-6 w-6',
                                        message.reactions?.disliked && 'text-red-500',
                                      )}
                                      onClick={() => handleReaction(message.id, 'dislike')}
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Not helpful</TooltipContent>
                                </Tooltip>
                              </>
                            )}

                            {message.status === 'error' && message.role === 'user' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => retryMessage(message.id)}
                                  >
                                    <RotateCw className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Retry</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        {/* Message metadata */}
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {message.status === 'delivered' && message.role === 'user' && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}

                          {message.status === 'error' && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}

                          {message.editedAt && (
                            <span className="text-xs text-muted-foreground">(edited)</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {(isLoading || isTyping) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-3 rounded-2xl">
                        <div className="flex items-center gap-1">
                          <motion.span
                            className="w-2 h-2 rounded-full bg-orange-500"
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: 0,
                            }}
                          />
                          <motion.span
                            className="w-2 h-2 rounded-full bg-orange-500"
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: 0.15,
                            }}
                          />
                          <motion.span
                            className="w-2 h-2 rounded-full bg-orange-500"
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: 0.3,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Actions */}
              <div className="px-4 py-2 border-t border-border/40">
                <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {quickActions.map((action) => {
                    const Icon = action.icon || Sparkles
                    return (
                      <motion.div
                        key={action.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInput(action.query)
                            handleSend(action.query)
                          }}
                          className={cn(
                            'text-xs whitespace-nowrap border-orange-500/30 hover:bg-orange-500/10 flex items-center gap-2',
                            action.color && `hover:border-${action.color}-500/50`,
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-3 w-3',
                              action.color ? `text-${action.color}-500` : 'text-orange-500',
                            )}
                          />
                          {action.label}
                          {action.command && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1">
                              {action.command}
                            </Badge>
                          )}
                        </Button>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/40">
                {/* File attachment preview */}
                {selectedFile && (
                  <div className="mb-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4 text-orange-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="text-xs truncate">{selectedFile.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Input area */}
                <div className="flex gap-2">
                  {/* File attachment */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-orange-500/30 hover:bg-orange-500/10"
                        disabled={isLoading}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach file</TooltipContent>
                  </Tooltip>

                  {/* Voice input */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleRecording}
                        className={cn(
                          'border-orange-500/30 hover:bg-orange-500/10',
                          isRecording && 'bg-red-500/20 border-red-500/50',
                        )}
                        disabled={isLoading}
                      >
                        {isRecording ? (
                          <MicOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isRecording ? 'Stop recording' : 'Start voice input'}
                    </TooltipContent>
                  </Tooltip>

                  {/* Text input */}
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !multiline) {
                        e.preventDefault()
                        handleSend()
                      }
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSend()
                      }
                    }}
                    placeholder={showCommands ? 'Type / for commands' : t('placeholder')}
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-black/50 border-orange-500/30 focus-visible:ring-orange-500"
                    disabled={isLoading}
                    rows={1}
                  />

                  {/* Send button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleSend()}
                        disabled={(!input.trim() && !selectedFile) || isLoading}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send message (Enter)</TooltipContent>
                  </Tooltip>
                </div>

                {/* Input hints */}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {showCommands ? (
                      <span className="flex items-center gap-1">
                        <Command className="h-3 w-3" />
                        Type /help for commands
                      </span>
                    ) : (
                      'Shift+Enter for new line • Ctrl+Enter to send'
                    )}
                  </p>

                  {/* Connection status */}
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs',
                      connectionStatus === 'online'
                        ? 'text-green-500'
                        : connectionStatus === 'offline'
                          ? 'text-red-500'
                          : 'text-yellow-500',
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        connectionStatus === 'online'
                          ? 'bg-green-500'
                          : connectionStatus === 'offline'
                            ? 'bg-red-500'
                            : 'bg-yellow-500 animate-pulse',
                      )}
                    />
                    {connectionStatus}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
