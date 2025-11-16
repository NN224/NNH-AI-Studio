/**
 * Interactive Hero Component
 * Production-ready interactive onboarding experience
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, ArrowRight, Check } from 'lucide-react'
import { usePersonalization } from '../hooks/usePersonalization'
import { BUSINESS_TYPES, LOCATION_COUNTS, CHALLENGES, ICON_MAP } from '../constants'
import type { InteractiveStep, BusinessType, LocationCount, Challenge } from '../types'

export default function InteractiveHero() {
  const router = useRouter()
  const { preferences, savePreferences, getPersonalizedResult } = usePersonalization()
  const [step, setStep] = useState<InteractiveStep>('welcome')
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType | null>(null)
  const [selectedLocationCount, setSelectedLocationCount] = useState<LocationCount | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)

  // Auto-advance if preferences exist
  useEffect(() => {
    if (preferences) {
      setSelectedBusinessType(preferences.businessType || null)
      setSelectedLocationCount(preferences.locationCount || null)
      setSelectedChallenge(preferences.challenge || null)
      
      if (preferences.businessType && preferences.locationCount && preferences.challenge) {
        setStep('result')
      }
    }
  }, [preferences])

  const handleBusinessType = (type: BusinessType) => {
    setSelectedBusinessType(type)
    savePreferences({ businessType: type })
    setStep('locations')
  }

  const handleLocationCount = (count: LocationCount) => {
    setSelectedLocationCount(count)
    savePreferences({ locationCount: count })
    setStep('challenge')
  }

  const handleChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge)
    savePreferences({ challenge })
    setStep('result')
  }

  const handleStartTrial = () => {
    const result = getPersonalizedResult()
    if (result) {
      // Pass personalization data to signup
      router.push(`/auth/signup?plan=${result.plan}&ref=interactive_hero`)
    }
  }

  const handleReset = () => {
    setStep('welcome')
    setSelectedBusinessType(null)
    setSelectedLocationCount(null)
    setSelectedChallenge(null)
  }

  const result = getPersonalizedResult()

  return (
    <div className="min-h-[600px] flex items-center justify-center py-20 px-4">
      <div className="max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <WelcomeStep key="welcome" onStart={() => setStep('business-type')} />
          )}

          {/* Business Type Step */}
          {step === 'business-type' && (
            <BusinessTypeStep
              key="business-type"
              selected={selectedBusinessType}
              onSelect={handleBusinessType}
            />
          )}

          {/* Location Count Step */}
          {step === 'locations' && (
            <LocationCountStep
              key="locations"
              selected={selectedLocationCount}
              onSelect={handleLocationCount}
            />
          )}

          {/* Challenge Step */}
          {step === 'challenge' && (
            <ChallengeStep
              key="challenge"
              selected={selectedChallenge}
              onSelect={handleChallenge}
            />
          )}

          {/* Result Step */}
          {step === 'result' && result && (
            <ResultStep
              key="result"
              result={result}
              businessType={selectedBusinessType!}
              locationCount={selectedLocationCount!}
              onStartTrial={handleStartTrial}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        {step !== 'welcome' && step !== 'result' && (
          <ProgressIndicator currentStep={step} />
        )}
      </div>
    </div>
  )
}

// Welcome Step Component
function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm border border-primary/30"
      >
        <Sparkles className="w-12 h-12 text-primary" />
      </motion.div>
      
      <div className="space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold"
        >
          👋 مرحباً! أنا{' '}
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
            NNH AI Assistant
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          بساعدك تلاقي الحل المثالي لعملك في <span className="text-primary font-semibold">3 خطوات فقط</span>
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          size="lg"
          onClick={onStart}
          className="gradient-orange text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          ابدأ الآن
          <ArrowRight className="w-5 h-5 mr-2" />
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-muted-foreground"
      >
        ⏱️ يستغرق أقل من دقيقة
      </motion.p>
    </motion.div>
  )
}

// Business Type Step Component
function BusinessTypeStep({
  selected,
  onSelect
}: {
  selected: BusinessType | null
  onSelect: (type: BusinessType) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold"
        >
          شو نوع عملك؟
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          اختار النوع الأقرب لعملك
        </motion.p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {BUSINESS_TYPES.map((type, index) => {
          const IconComponent = ICON_MAP[type.icon as keyof typeof ICON_MAP]
          
          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`
                  p-6 cursor-pointer transition-all duration-300 group
                  hover:border-primary hover:shadow-lg hover:scale-105
                  ${selected === type.id ? 'border-primary bg-primary/5' : 'border-primary/20'}
                `}
                onClick={() => onSelect(type.id)}
              >
                <div className="text-center space-y-3">
                  <div className={`
                    w-16 h-16 mx-auto rounded-xl flex items-center justify-center transition-colors
                    ${selected === type.id ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/20'}
                  `}>
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// Location Count Step Component
function LocationCountStep({
  selected,
  onSelect
}: {
  selected: LocationCount | null
  onSelect: (count: LocationCount) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold"
        >
          رائع! عندك كم فرع؟
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          اختار عدد الفروع
        </motion.p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {LOCATION_COUNTS.map((count, index) => (
          <motion.div
            key={count.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant={selected === count.id ? 'default' : 'outline'}
              size="lg"
              className={`
                w-full h-28 text-xl transition-all duration-300
                ${selected === count.id 
                  ? 'bg-gradient-to-br from-primary to-accent hover:opacity-90' 
                  : 'hover:bg-primary/10 hover:border-primary hover:scale-105'
                }
              `}
              onClick={() => onSelect(count.id)}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl font-bold">{count.label}</span>
                <span className="text-xs opacity-80">{count.labelEn}</span>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// Challenge Step Component
function ChallengeStep({
  selected,
  onSelect
}: {
  selected: Challenge | null
  onSelect: (challenge: Challenge) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold"
        >
          ممتاز! شو أكبر تحدي عندك؟
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          اختار التحدي الأكبر
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHALLENGES.map((challenge, index) => {
          const IconComponent = ICON_MAP[challenge.icon as keyof typeof ICON_MAP]
          
          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`
                  p-6 cursor-pointer transition-all duration-300 group
                  hover:border-primary hover:shadow-lg hover:scale-105
                  ${selected === challenge.id ? 'border-primary bg-primary/5' : 'border-primary/20'}
                `}
                onClick={() => onSelect(challenge.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0
                    ${selected === challenge.id ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/20'}
                  `}>
                    <IconComponent className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold mb-1">{challenge.label}</p>
                    <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                    <p className="text-xs text-primary font-medium">
                      ✨ {challenge.solution}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// Result Step Component
function ResultStep({
  result,
  businessType,
  locationCount,
  onStartTrial,
  onReset
}: {
  result: any
  businessType: BusinessType
  locationCount: LocationCount
  onStartTrial: () => void
  onReset: () => void
}) {
  const businessLabel = BUSINESS_TYPES.find(b => b.id === businessType)?.label
  const locationLabel = LOCATION_COUNTS.find(l => l.id === locationCount)?.label

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-center"
      >
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center mb-6 border border-green-500/30">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="text-5xl"
          >
            ✓
          </motion.div>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          🎉 رائع! لقيت الحل المثالي لك!
        </h2>
        <p className="text-xl text-muted-foreground">
          بناءً على اختياراتك، هذا أفضل حل لـ{' '}
          <span className="text-primary font-semibold">{businessLabel}</span>{' '}
          مع{' '}
          <span className="text-primary font-semibold">{locationLabel}</span>
        </p>
      </motion.div>

      {/* Result Card */}
      <Card className="border-primary/30 glass-strong overflow-hidden">
        <CardContent className="p-8 space-y-6">
          {/* Plan Header */}
          <div className="text-center pb-6 border-b border-primary/20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {result.plan === 'free' ? 'خطة مجانية' : result.plan === 'pro' ? 'خطة Pro' : 'خطة Agency'}
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-2">خطتك المخصصة 🎯</h3>
            <div className="text-5xl font-bold text-primary">
              ${result.price}
              <span className="text-lg text-muted-foreground">/شهر</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-primary/10">
              <div className="text-3xl font-bold text-primary">{result.benefits.timeSaved}</div>
              <p className="text-sm text-muted-foreground mt-1">وقت موفر</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/10">
              <div className="text-3xl font-bold text-primary">{result.benefits.visibilityIncrease}</div>
              <p className="text-sm text-muted-foreground mt-1">زيادة ظهور</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/10">
              <div className="text-3xl font-bold text-primary">{result.benefits.responseRate}</div>
              <p className="text-sm text-muted-foreground mt-1">معدل رد</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/10">
              <div className="text-3xl font-bold text-primary">{result.benefits.roi}</div>
              <p className="text-sm text-muted-foreground mt-1">عائد استثمار</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <p className="font-semibold text-lg mb-4">ما تحصل عليه:</p>
            {result.features.map((feature: string, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="pt-6 border-t border-primary/20">
              <p className="font-semibold text-lg mb-4">💡 نصائح مخصصة لك:</p>
              <div className="space-y-2">
                {result.recommendations.map((rec: string, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-primary mt-0.5">•</span>
                    <span>{rec}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              size="lg"
              className="flex-1 gradient-orange text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
              onClick={onStartTrial}
            >
              ابدأ تجربة مجانية 🚀
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary/30 hover:bg-primary/10"
              onClick={onReset}
            >
              ابدأ من جديد
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            ✨ تجربة مجانية 14 يوم • بدون بطاقة ائتمان
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Progress Indicator Component
function ProgressIndicator({ currentStep }: { currentStep: InteractiveStep }) {
  const steps: InteractiveStep[] = ['business-type', 'locations', 'challenge']
  const currentIndex = steps.indexOf(currentStep)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-8 flex justify-center gap-2"
    >
      {steps.map((step, index) => (
        <motion.div
          key={step}
          initial={{ width: 0 }}
          animate={{ width: index <= currentIndex ? 64 : 64 }}
          className={`
            h-2 rounded-full transition-all duration-300
            ${index <= currentIndex ? 'bg-primary' : 'bg-primary/20'}
          `}
        />
      ))}
    </motion.div>
  )
}

