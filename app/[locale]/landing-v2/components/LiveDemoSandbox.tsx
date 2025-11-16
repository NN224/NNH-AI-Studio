/**
 * Live Demo Sandbox Component
 * Production-ready interactive demo environment
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, X, Maximize2, Minimize2, 
  MapPin, Star, MessageSquare, FileText,
  TrendingUp, Clock, CheckCircle, Sparkles
} from 'lucide-react'
import {
  demoLocations,
  demoReviews,
  demoPosts,
  demoStats,
  generateAIResponse,
  timeAgo,
  type DemoReview
} from '../demo/demo-data'

export default function LiveDemoSandbox() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedReview, setSelectedReview] = useState<DemoReview | null>(null)
  const [aiResponse, setAiResponse] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate AI response
  const handleGenerateAIResponse = (review: DemoReview) => {
    setSelectedReview(review)
    setIsGenerating(true)
    
    // Simulate AI thinking
    setTimeout(() => {
      const response = generateAIResponse(review)
      setAiResponse(response)
      setIsGenerating(false)
    }, 1500)
  }

  // Close demo on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <>
      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <h2 className="text-4xl font-bold mb-6">
          🎮 جرب المنصة الآن - <span className="text-primary">بدون تسجيل!</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          اختبر كل الميزات في بيئة تجريبية كاملة. شوف كيف NNH AI Studio بتسهل شغلك!
        </p>
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="gradient-orange text-xl px-12 py-8 shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105"
        >
          <Play className="w-6 h-6 ml-2" />
          ابدأ التجربة المجانية
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          ⚡ جاهز في ثانية واحدة • 🎯 بيانات حقيقية • 🤖 AI كامل
        </p>
      </motion.div>

      {/* Demo Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`
                bg-card rounded-2xl shadow-2xl overflow-hidden
                ${isFullscreen ? 'w-full h-full' : 'w-full max-w-7xl h-[90vh]'}
                transition-all duration-300
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium ml-4">
                    🎮 Live Demo - NNH AI Studio
                  </span>
                  <Badge variant="outline" className="border-primary/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Sandbox Mode
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="h-[calc(100%-64px)] overflow-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                  <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-6">
                    <TabsTrigger value="dashboard" className="gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="locations" className="gap-2">
                      <MapPin className="w-4 h-4" />
                      المواقع
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      التقييمات
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="gap-2">
                      <FileText className="w-4 h-4" />
                      المنشورات
                    </TabsTrigger>
                  </TabsList>

                  {/* Dashboard Tab */}
                  <TabsContent value="dashboard" className="p-6 space-y-6">
                    <DashboardView stats={demoStats} />
                  </TabsContent>

                  {/* Locations Tab */}
                  <TabsContent value="locations" className="p-6">
                    <LocationsView locations={demoLocations} />
                  </TabsContent>

                  {/* Reviews Tab */}
                  <TabsContent value="reviews" className="p-6">
                    <ReviewsView
                      reviews={demoReviews}
                      onGenerateAI={handleGenerateAIResponse}
                      selectedReview={selectedReview}
                      aiResponse={aiResponse}
                      isGenerating={isGenerating}
                    />
                  </TabsContent>

                  {/* Posts Tab */}
                  <TabsContent value="posts" className="p-6">
                    <PostsView posts={demoPosts} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer CTA */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <p className="text-sm text-muted-foreground">
                    💡 هذا مجرد عرض توضيحي. سجل الآن للحصول على الوصول الكامل!
                  </p>
                  <Button className="gradient-orange">
                    ابدأ تجربة مجانية 14 يوم
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Dashboard View Component
function DashboardView({ stats }: { stats: typeof demoStats }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">📊 نظرة عامة</h3>
        <p className="text-muted-foreground">إحصائيات شاملة لجميع مواقعك</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-strong">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المواقع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLocations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500">+2</span> هذا الشهر
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي التقييمات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500">+{stats.growthRate}%</span> نمو
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              متوسط التقييم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              {stats.averageRating}
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ممتاز! استمر
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              معدل الرد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.responseRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingReviews} تقييم معلق
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle>📈 تحليل الأداء</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-primary" />
              <p>الرسوم البيانية التفاعلية متاحة في النسخة الكاملة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Locations View Component
function LocationsView({ locations }: { locations: typeof demoLocations }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold mb-2">📍 مواقعك</h3>
        <p className="text-muted-foreground">إدارة جميع فروعك من مكان واحد</p>
      </div>

      <div className="grid gap-4">
        {locations.map((location) => (
          <Card key={location.id} className="glass-strong hover-lift">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold">{location.name}</h4>
                    <Badge variant={location.status === 'active' ? 'default' : 'secondary'}>
                      {location.status === 'active' ? 'نشط' : 'معلق'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{location.address}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{location.rating}</span>
                      <span className="text-muted-foreground">({location.totalReviews})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{location.responseRate}% معدل رد</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  عرض التفاصيل
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Reviews View Component
function ReviewsView({
  reviews,
  onGenerateAI,
  selectedReview,
  aiResponse,
  isGenerating
}: {
  reviews: DemoReview[]
  onGenerateAI: (review: DemoReview) => void
  selectedReview: DemoReview | null
  aiResponse: string
  isGenerating: boolean
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold mb-2">⭐ التقييمات</h3>
        <p className="text-muted-foreground">رد على التقييمات بذكاء AI</p>
      </div>

      <div className="grid gap-4">
        {reviews.map((review) => (
          <Card key={review.id} className="glass-strong">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold">
                    {review.reviewerName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{review.reviewerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.locationName} • {timeAgo(review.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm mb-3">{review.text}</p>
                  
                  {review.reply ? (
                    <div className="bg-primary/10 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-primary mb-1">ردك:</p>
                      <p className="text-sm">{review.reply}</p>
                    </div>
                  ) : (
                    <div>
                      {selectedReview?.id === review.id && (
                        <div className="bg-primary/10 rounded-lg p-3 mb-3">
                          {isGenerating ? (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                              <span>AI يكتب الرد...</span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-medium text-primary mb-1">رد AI المقترح:</p>
                              <p className="text-sm">{aiResponse}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onGenerateAI(review)}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {selectedReview?.id === review.id && !isGenerating
                          ? 'إرسال الرد'
                          : 'رد بـ AI'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Posts View Component
function PostsView({ posts }: { posts: typeof demoPosts }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold mb-2">📝 المنشورات</h3>
        <p className="text-muted-foreground">جدول ونشر محتوى تلقائياً</p>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="glass-strong">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold mb-1">{post.title}</h4>
                  <p className="text-xs text-muted-foreground">{post.locationName}</p>
                </div>
                <Badge
                  variant={post.status === 'published' ? 'default' : 'secondary'}
                  className="gap-1"
                >
                  {post.status === 'published' ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      منشور
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3" />
                      مجدول
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm mb-3">{post.content}</p>
              <p className="text-xs text-muted-foreground">
                {post.status === 'published' ? 'نُشر' : 'سيُنشر'} {timeAgo(post.scheduledAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

