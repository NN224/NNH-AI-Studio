/**
 * ROI Calculator Component
 * Production-ready interactive ROI calculator
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  Calculator, TrendingUp, Clock, DollarSign, 
  Star, MessageSquare, Zap, ArrowRight
} from 'lucide-react'

interface ROIInputs {
  locations: number
  monthlyReviews: number
  currentRating: number
  currentResponseRate: number
  avgReplyTime: number // in hours
}

interface ROIResults {
  timeSaved: number // hours per month
  costSaved: number // dollars per month
  ratingImprovement: number // stars
  responseRateImprovement: number // percentage
  visibilityIncrease: number // percentage
  estimatedROI: number // percentage
  breakEvenMonths: number
}

const HOURLY_RATE = 25 // Average hourly rate for staff
const MONTHLY_COST = 49 // Pro plan cost

export default function ROICalculator() {
  const [inputs, setInputs] = useState<ROIInputs>({
    locations: 3,
    monthlyReviews: 50,
    currentRating: 4.2,
    currentResponseRate: 60,
    avgReplyTime: 24
  })

  const [results, setResults] = useState<ROIResults | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Calculate ROI
  const calculateROI = () => {
    setIsCalculating(true)

    // Simulate calculation delay
    setTimeout(() => {
      // Time saved calculation
      const avgTimePerReview = 5 // minutes
      const totalReviewsPerMonth = inputs.monthlyReviews * inputs.locations
      const manualTimeHours = (totalReviewsPerMonth * avgTimePerReview) / 60
      const aiTimeHours = (totalReviewsPerMonth * 1) / 60 // 1 min with AI
      const timeSaved = Math.round(manualTimeHours - aiTimeHours)

      // Cost saved
      const costSaved = Math.round(timeSaved * HOURLY_RATE)

      // Rating improvement (based on response rate improvement)
      const responseRateImprovement = Math.min(100 - inputs.currentResponseRate, 40)
      const ratingImprovement = Math.round((responseRateImprovement / 100) * 0.8 * 10) / 10

      // Visibility increase (based on rating and response rate)
      const visibilityIncrease = Math.round(
        (ratingImprovement / 5) * 100 + responseRateImprovement * 1.5
      )

      // ROI calculation
      const monthlySavings = costSaved - MONTHLY_COST
      const estimatedROI = Math.round((monthlySavings / MONTHLY_COST) * 100)

      // Break-even calculation
      const breakEvenMonths = monthlySavings > 0 ? 1 : Math.ceil(MONTHLY_COST / (costSaved / 2))

      setResults({
        timeSaved,
        costSaved,
        ratingImprovement,
        responseRateImprovement,
        visibilityIncrease,
        estimatedROI,
        breakEvenMonths
      })

      setIsCalculating(false)
    }, 1000)
  }

  // Auto-calculate on input change
  useEffect(() => {
    if (results) {
      calculateROI()
    }
  }, [inputs])

  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">ROI Calculator</span>
          </div>
          <h2 className="text-4xl font-bold mb-4">
            💰 احسب عائد استثمارك المتوقع
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            شوف كم بتوفر من وقت ومال مع NNH AI Studio
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  معلومات عملك
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Locations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>عدد الفروع</Label>
                    <span className="text-2xl font-bold text-primary">
                      {inputs.locations}
                    </span>
                  </div>
                  <Slider
                    value={[inputs.locations]}
                    onValueChange={([value]) => setInputs({ ...inputs, locations: value })}
                    min={1}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 فرع</span>
                    <span>50 فرع</span>
                  </div>
                </div>

                {/* Monthly Reviews */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>التقييمات الشهرية (لكل فرع)</Label>
                    <span className="text-2xl font-bold text-primary">
                      {inputs.monthlyReviews}
                    </span>
                  </div>
                  <Slider
                    value={[inputs.monthlyReviews]}
                    onValueChange={([value]) => setInputs({ ...inputs, monthlyReviews: value })}
                    min={10}
                    max={500}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10 تقييم</span>
                    <span>500 تقييم</span>
                  </div>
                </div>

                {/* Current Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>متوسط التقييم الحالي</Label>
                    <span className="text-2xl font-bold text-primary flex items-center gap-1">
                      {inputs.currentRating.toFixed(1)}
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </span>
                  </div>
                  <Slider
                    value={[inputs.currentRating * 10]}
                    onValueChange={([value]) => setInputs({ ...inputs, currentRating: value / 10 })}
                    min={10}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1.0⭐</span>
                    <span>5.0⭐</span>
                  </div>
                </div>

                {/* Current Response Rate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>معدل الرد الحالي</Label>
                    <span className="text-2xl font-bold text-primary">
                      {inputs.currentResponseRate}%
                    </span>
                  </div>
                  <Slider
                    value={[inputs.currentResponseRate]}
                    onValueChange={([value]) => setInputs({ ...inputs, currentResponseRate: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Average Reply Time */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>متوسط وقت الرد الحالي</Label>
                    <span className="text-2xl font-bold text-primary">
                      {inputs.avgReplyTime}h
                    </span>
                  </div>
                  <Slider
                    value={[inputs.avgReplyTime]}
                    onValueChange={([value]) => setInputs({ ...inputs, avgReplyTime: value })}
                    min={1}
                    max={72}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 ساعة</span>
                    <span>72 ساعة</span>
                  </div>
                </div>

                {/* Calculate Button */}
                {!results && (
                  <Button
                    onClick={calculateROI}
                    disabled={isCalculating}
                    className="w-full gradient-orange text-lg py-6"
                  >
                    {isCalculating ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                        جاري الحساب...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-5 h-5 mr-2" />
                        احسب العائد
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            {results ? (
              <Card className="glass-strong border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    نتائجك المتوقعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Time Saved */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">وقت موفر شهرياً</p>
                        <p className="text-4xl font-bold">{results.timeSaved} ساعة</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      = {Math.round(results.timeSaved / 8)} يوم عمل كامل!
                    </p>
                  </motion.div>

                  {/* Cost Saved */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">توفير مالي شهري</p>
                        <p className="text-4xl font-bold text-green-500">
                          ${results.costSaved}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      بعد خصم تكلفة الاشتراك (${MONTHLY_COST})
                    </p>
                  </motion.div>

                  {/* Grid of smaller metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Rating Improvement */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                    >
                      <Star className="w-6 h-6 text-yellow-500 fill-yellow-500 mb-2" />
                      <p className="text-2xl font-bold">+{results.ratingImprovement}</p>
                      <p className="text-xs text-muted-foreground">تحسين التقييم</p>
                    </motion.div>

                    {/* Response Rate */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
                    >
                      <MessageSquare className="w-6 h-6 text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">+{results.responseRateImprovement}%</p>
                      <p className="text-xs text-muted-foreground">معدل رد</p>
                    </motion.div>

                    {/* Visibility */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
                    >
                      <TrendingUp className="w-6 h-6 text-purple-500 mb-2" />
                      <p className="text-2xl font-bold">+{results.visibilityIncrease}%</p>
                      <p className="text-xs text-muted-foreground">زيادة ظهور</p>
                    </motion.div>

                    {/* ROI */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="p-4 rounded-xl bg-green-500/10 border border-green-500/30"
                    >
                      <DollarSign className="w-6 h-6 text-green-500 mb-2" />
                      <p className="text-2xl font-bold">{results.estimatedROI}%</p>
                      <p className="text-xs text-muted-foreground">عائد استثمار</p>
                    </motion.div>
                  </div>

                  {/* Break-even */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center"
                  >
                    <p className="text-sm text-muted-foreground mb-1">
                      نقطة التعادل
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {results.breakEvenMonths} {results.breakEvenMonths === 1 ? 'شهر' : 'أشهر'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      بعدها كل شي ربح صافي! 🎉
                    </p>
                  </motion.div>

                  {/* CTA */}
                  <Button
                    className="w-full gradient-orange text-lg py-6"
                    onClick={() => {
                      // Track conversion
                      if (typeof window !== 'undefined' && (window as any).gtag) {
                        (window as any).gtag('event', 'roi_calculator_cta', {
                          time_saved: results.timeSaved,
                          cost_saved: results.costSaved,
                          roi: results.estimatedROI
                        })
                      }
                    }}
                  >
                    ابدأ توفير ${results.costSaved}/شهر الآن
                    <ArrowRight className="w-5 h-5 mr-2" />
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    ✨ تجربة مجانية 14 يوم • بدون بطاقة ائتمان
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-strong h-full flex items-center justify-center">
                <CardContent className="text-center py-20">
                  <Calculator className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
                  <p className="text-xl text-muted-foreground mb-2">
                    أدخل معلومات عملك
                  </p>
                  <p className="text-sm text-muted-foreground">
                    واضغط "احسب العائد" لرؤية النتائج
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Bottom Info */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <Card className="glass inline-block">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>ملاحظة:</strong> هذه الأرقام تقديرية بناءً على متوسطات الصناعة.
                  النتائج الفعلية قد تختلف حسب نوع عملك وموقعك.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

