'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Navigation,
  Rocket,
  Target,
  Zap,
  BarChart3,
  Trophy,
  MessageSquare,
  MousePointer,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'
import { createPopper, type Instance as PopperInstance, type Placement } from '@popperjs/core'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  targetSelector?: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: () => void
  interactive?: {
    type: 'click' | 'hover' | 'scroll'
    element: string
  }
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your AI-Powered Dashboard! 🎉',
    description:
      'Let me show you how to 10x your business management with AI. This tour is personalized just for you!',
    icon: Rocket,
    position: 'center',
  },
  {
    id: 'hero',
    title: 'Your Personal Command Center',
    description:
      'Get personalized greetings, track your progress, and see key metrics at a glance.',
    icon: Target,
    targetSelector: '.dashboard-hero',
    position: 'bottom',
  },
  {
    id: 'quick-actions',
    title: 'One-Click Power Actions',
    description:
      'Access everything you need instantly. Try hovering over these buttons to see the magic!',
    icon: Zap,
    targetSelector: '.quick-actions',
    position: 'bottom',
    interactive: {
      type: 'hover',
      element: '.quick-actions button:first-child',
    },
  },
  {
    id: 'ai-insights',
    title: 'AI That Works For You',
    description:
      'Get smart recommendations that actually help grow your business. Click any insight to dive deeper!',
    icon: Sparkles,
    targetSelector: '.ai-insights',
    position: 'top',
    interactive: {
      type: 'click',
      element: '.ai-insights .insight-card:first-child',
    },
  },
  {
    id: 'stats',
    title: 'Real-Time Analytics',
    description:
      'Watch your stats update in real-time. The charts are interactive - try clicking on them!',
    icon: BarChart3,
    targetSelector: '.stats-overview',
    position: 'top',
  },
  {
    id: 'achievements',
    title: 'Level Up Your Business',
    description:
      'Earn points, unlock achievements, and compete on the leaderboard. Business management has never been this fun!',
    icon: Trophy,
    targetSelector: '.achievements',
    position: 'left',
  },
  {
    id: 'ai-chat',
    title: 'Your 24/7 AI Assistant',
    description:
      'Have questions? Need help? Click the orange button anytime to chat with your personal AI assistant!',
    icon: MessageSquare,
    targetSelector: '.ai-chat-button',
    position: 'left',
  },
  {
    id: 'complete',
    title: "You're All Set! 🚀",
    description:
      "Congratulations! You've unlocked the full power of AI-driven business management. Let's achieve greatness together!",
    icon: Trophy,
    position: 'center',
    action: () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff6b00', '#ffc107', '#4caf50'],
      })
    },
  },
]

export function EnhancedOnboarding() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasCompletedTour, setHasCompletedTour] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const popperInstanceRef = useRef<PopperInstance | null>(null)

  useEffect(() => {
    const completed = localStorage.getItem('enhanced-onboarding-completed')
    if (!completed && !hasCompletedTour) {
      const timer = setTimeout(() => {
        setIsActive(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
    setHasCompletedTour(true)
  }, [hasCompletedTour])

  const getCurrentStep = useCallback(() => tourSteps[currentStep], [currentStep])

  const completeTour = useCallback(() => {
    localStorage.setItem('enhanced-onboarding-completed', 'true')
    setHasCompletedTour(true)
    setIsActive(false)
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      completeTour()
    }
  }, [currentStep, completeTour])

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const skipTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  // Run step action and wire interactive behavior
  useEffect(() => {
    if (!isActive) return

    const step = getCurrentStep()
    if (step.action) {
      step.action()
    }

    if (!step.interactive) return

    const element = document.querySelector(step.interactive.element)
    if (!element) return

    const handleInteraction = () => {
      setIsInteracting(true)
      setTimeout(() => {
        setIsInteracting(false)
        handleNext()
      }, 1500)
    }

    if (step.interactive.type === 'click') {
      element.addEventListener('click', handleInteraction)
    } else if (step.interactive.type === 'hover') {
      element.addEventListener('mouseenter', handleInteraction)
    }

    return () => {
      element.removeEventListener('click', handleInteraction)
      element.removeEventListener('mouseenter', handleInteraction)
    }
  }, [getCurrentStep, handleNext, isActive])

  // Spotlight position + auto-scroll
  useEffect(() => {
    if (!isActive || !spotlightRef.current) return

    const step = getCurrentStep()
    if (!step.targetSelector) {
      spotlightRef.current.style.opacity = '0'
      return
    }

    const targetElement = document.querySelector(step.targetSelector) as HTMLElement | null
    if (!targetElement) {
      spotlightRef.current.style.opacity = '0'
      return
    }

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const rect = targetElement.getBoundingClientRect()
    const spotlight = spotlightRef.current

    spotlight.style.left = `${rect.left - 20}px`
    spotlight.style.top = `${rect.top - 20}px`
    spotlight.style.width = `${rect.width + 40}px`
    spotlight.style.height = `${rect.height + 40}px`
    spotlight.style.opacity = '1'
  }, [getCurrentStep, isActive])

  const getPopperPlacement = (position: TourStep['position']): Placement => {
    switch (position) {
      case 'top':
        return 'top'
      case 'bottom':
        return 'bottom'
      case 'left':
        return 'left'
      case 'right':
        return 'right'
      default:
        return 'auto'
    }
  }

  // Wire Popper for tooltip
  useEffect(() => {
    if (!isActive) return

    const step = getCurrentStep()

    if (step.position === 'center') {
      if (popperInstanceRef.current) {
        popperInstanceRef.current.destroy()
        popperInstanceRef.current = null
      }
      return
    }

    const targetElement = step.targetSelector
      ? (document.querySelector(step.targetSelector) as HTMLElement | null)
      : null
    const tooltipElement = tooltipRef.current

    if (!targetElement || !tooltipElement) {
      if (popperInstanceRef.current) {
        popperInstanceRef.current.destroy()
        popperInstanceRef.current = null
      }
      return
    }

    if (popperInstanceRef.current) {
      popperInstanceRef.current.destroy()
    }

    popperInstanceRef.current = createPopper(targetElement, tooltipElement, {
      placement: getPopperPlacement(step.position),
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, 16],
          },
        },
        {
          name: 'preventOverflow',
          options: {
            padding: 16,
          },
        },
        {
          name: 'flip',
          options: {
            padding: 16,
          },
        },
      ],
    })

    return () => {
      if (popperInstanceRef.current) {
        popperInstanceRef.current.destroy()
        popperInstanceRef.current = null
      }
    }
  }, [getCurrentStep, isActive])

  if (hasCompletedTour || !isActive) return null

  const step = getCurrentStep()
  const Icon = step.icon
  const progress = ((currentStep + 1) / tourSteps.length) * 100

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            onClick={skipTour}
          />

          {/* Spotlight effect */}
          <div
            ref={spotlightRef}
            className="fixed z-[99] pointer-events-none transition-all duration-500 ease-out"
            style={{
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)',
              borderRadius: '12px',
              opacity: 0,
            }}
          />

          {/* Tour tooltip */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            ref={tooltipRef}
            className={cn(
              'fixed z-[101] pointer-events-none',
              step.position === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            )}
          >
            <Card className="w-[90vw] max-w-md bg-gradient-to-br from-gray-900 via-black to-gray-900 backdrop-blur-xl border-orange-500/50 shadow-2xl shadow-orange-500/20 pointer-events-auto">
              {/* Progress bar */}
              <div className="relative h-1 bg-gray-800 rounded-t-lg overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-yellow-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="p-6">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
                    Step {currentStep + 1} of {tourSteps.length}
                  </Badge>

                  {/* Close button */}
                  <button
                    onClick={skipTour}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {/* Icon and title */}
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="flex-shrink-0"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </motion.div>

                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{step.description}</p>
                    </div>
                  </div>

                  {/* Interactive hint */}
                  {step.interactive && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                    >
                      <MousePointer className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-400">
                        {step.interactive.type === 'click' &&
                          'Click the highlighted element to continue'}
                        {step.interactive.type === 'hover' &&
                          'Hover over the highlighted element to continue'}
                        {step.interactive.type === 'scroll' && 'Scroll to see more'}
                      </span>
                    </motion.div>
                  )}

                  {/* Progress dots */}
                  <div className="flex items-center justify-center gap-1.5 py-2">
                    {tourSteps.map((_, index) => (
                      <motion.div
                        key={index}
                        initial={false}
                        animate={{
                          width: index === currentStep ? 24 : 6,
                          opacity: index <= currentStep ? 1 : 0.3,
                        }}
                        className={cn(
                          'h-1.5 rounded-full transition-colors',
                          index <= currentStep ? 'bg-orange-500' : 'bg-gray-700',
                        )}
                      />
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      onClick={skipTour}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      Skip Tour
                    </Button>

                    <div className="flex gap-2">
                      {currentStep > 0 && (
                        <Button
                          variant="outline"
                          onClick={handlePrev}
                          className="border-gray-700 hover:bg-gray-800"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        onClick={handleNext}
                        disabled={isInteracting && step.interactive !== undefined}
                        className={cn(
                          'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
                          isInteracting && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {currentStep === tourSteps.length - 1 ? (
                          <>
                            Complete Tour
                            <CheckCircle className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          <>
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Pointing arrow */}
            {step.targetSelector && step.position !== 'center' && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'absolute w-8 h-8 text-orange-500',
                  step.position === 'top' &&
                    'bottom-0 left-1/2 -translate-x-1/2 translate-y-full -rotate-180',
                  step.position === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
                  step.position === 'left' &&
                    'right-0 top-1/2 -translate-y-1/2 translate-x-full rotate-90',
                  step.position === 'right' &&
                    'left-0 top-1/2 -translate-y-1/2 -translate-x-full -rotate-90',
                )}
              >
                <Navigation className="w-full h-full fill-current" />
              </motion.div>
            )}
          </motion.div>

          {/* Interactive element highlight */}
          {isInteracting && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 flex items-center justify-center z-[102] pointer-events-none"
            >
              <div className="text-6xl animate-bounce">✨</div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
