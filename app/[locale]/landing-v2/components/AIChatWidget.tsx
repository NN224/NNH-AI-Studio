/**
 * AI Chat Widget Component
 * Production-ready floating chat assistant
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, X, Send, Sparkles, 
  Calendar, Play, DollarSign, HelpCircle,
  Zap, CheckCircle, ArrowRight
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  quickActions?: QuickAction[]
}

interface QuickAction {
  id: string
  label: string
  icon: any
  action: () => void
}

const QUICK_QUESTIONS = [
  'كم سعر الخطة للمطاعم؟',
  'كيف يعمل AI Reply؟',
  'عندي 10 فروع، شو الخطة المناسبة؟',
  'بدي أشوف demo',
  'شو الفرق بين Pro و Agency؟',
  'كيف أبدأ؟'
]

const AI_RESPONSES: Record<string, string> = {
  'سعر': 'خطة Pro تبدأ من $49/شهر لحتى 25 موقع، وخطة Agency من $149/شهر للمواقع غير المحدودة. عندك تجربة مجانية 14 يوم! 🎉',
  'ai reply': 'AI Reply يستخدم ذكاء اصطناعي متقدم لكتابة ردود احترافية ومخصصة على التقييمات في ثوانٍ. يحلل المشاعر ويقترح أفضل رد! 🤖',
  '10 فروع': 'مع 10 فروع، خطة Pro مثالية لك! تشمل حتى 25 موقع، AI كامل، وتحليلات متقدمة بـ $49/شهر فقط. وفر $1,200 سنوياً! 💰',
  'demo': 'رائع! بتقدر تجرب المنصة مباشرة بدون تسجيل. اضغط على زر "جرب المنصة الآن" أعلى الصفحة! 🎮',
  'فرق': 'Pro: حتى 25 موقع، AI كامل، تحليلات متقدمة ($49). Agency: مواقع غير محدودة، White-label، API access، مدير حساب ($149). 🚀',
  'أبدأ': 'سهل جداً! 1) سجل حساب مجاني 2) اربط حساب GMB 3) فعّل AI 4) استمتع بالأتمتة! تستغرق 5 دقائق فقط. ✨',
  'default': 'شكراً على سؤالك! فريقنا جاهز لمساعدتك. بتقدر تتواصل معنا مباشرة أو تجرب المنصة مجاناً لمدة 14 يوم! 😊'
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content: '👋 مرحباً! أنا مساعدك الذكي في NNH AI Studio.\n\nكيف بقدر أساعدك اليوم؟',
          quickActions: [
            {
              id: 'demo',
              label: 'جرب Demo',
              icon: Play,
              action: () => handleQuickAction('بدي أشوف demo')
            },
            {
              id: 'pricing',
              label: 'الأسعار',
              icon: DollarSign,
              action: () => handleQuickAction('كم سعر الخطة؟')
            },
            {
              id: 'start',
              label: 'كيف أبدأ؟',
              icon: Zap,
              action: () => handleQuickAction('كيف أبدأ؟')
            },
            {
              id: 'schedule',
              label: 'احجز عرض',
              icon: Calendar,
              action: () => handleScheduleDemo()
            }
          ]
        })
      }, 500)
    }
  }, [isOpen])

  // Add message helper
  const addMessage = (msg: Partial<Message>) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...msg
    } as Message
    setMessages(prev => [...prev, newMessage])
  }

  // Handle send message
  const handleSend = () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    addMessage({ role: 'user', content: userMessage })
    setInput('')
    setIsTyping(true)

    // Simulate AI thinking
    setTimeout(() => {
      const response = getAIResponse(userMessage)
      addMessage({ role: 'assistant', content: response })
      setIsTyping(false)
    }, 1000 + Math.random() * 1000)
  }

  // Get AI response
  const getAIResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase()
    
    for (const [key, response] of Object.entries(AI_RESPONSES)) {
      if (lowerQuestion.includes(key)) {
        return response
      }
    }
    
    return AI_RESPONSES.default
  }

  // Handle quick action
  const handleQuickAction = (question: string) => {
    addMessage({ role: 'user', content: question })
    setIsTyping(true)

    setTimeout(() => {
      const response = getAIResponse(question)
      addMessage({ role: 'assistant', content: response })
      setIsTyping(false)
    }, 1000)
  }

  // Handle schedule demo
  const handleScheduleDemo = () => {
    addMessage({ 
      role: 'assistant', 
      content: '🎯 ممتاز! بنحب نعرض لك المنصة بالتفصيل.\n\nبتقدر تختار وقت مناسب لك من خلال رابط الحجز، أو بتقدر تجرب Demo المباشر الآن بدون موعد!'
    })
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              onClick={() => setIsOpen(true)}
              className="gradient-orange rounded-full w-16 h-16 shadow-2xl hover:shadow-primary/50 relative group"
            >
              <MessageCircle className="w-7 h-7" />
              
              {/* Pulse animation */}
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
              
              {/* Badge */}
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-background">
                AI
              </span>
            </Button>

            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="absolute bottom-0 right-20 bg-card border border-primary/30 rounded-lg px-4 py-2 shadow-lg whitespace-nowrap"
            >
              <p className="text-sm font-medium">💬 عندك سؤال؟ اسألني!</p>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-card" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)]"
          >
            <Card className="glass-strong shadow-2xl border-primary/30 overflow-hidden">
              {/* Header */}
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-primary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">NNH AI Assistant</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-muted-foreground">متصل الآن</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-primary/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="p-0">
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[80%] rounded-2xl px-4 py-3
                          ${message.role === 'user'
                            ? 'bg-gradient-to-br from-primary to-accent text-white'
                            : 'bg-card border border-primary/20'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Quick Actions */}
                        {message.quickActions && (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {message.quickActions.map((action) => {
                              const Icon = action.icon
                              return (
                                <Button
                                  key={action.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={action.action}
                                  className="text-xs h-auto py-2 border-primary/30 hover:bg-primary/10"
                                >
                                  <Icon className="w-3 h-3 mr-1" />
                                  {action.label}
                                </Button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-card border border-primary/20 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Questions */}
                {messages.length === 0 && (
                  <div className="px-4 pb-4 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground mb-2 mt-3">أسئلة شائعة:</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_QUESTIONS.slice(0, 3).map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(question)}
                          className="text-xs h-auto py-1.5 border-primary/30 hover:bg-primary/10"
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-primary/20">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="اكتب سؤالك هنا..."
                      className="flex-1 border-primary/30 focus:border-primary"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="gradient-orange"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    ⚡ ردود فورية بالذكاء الاصطناعي
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

