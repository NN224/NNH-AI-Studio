/**
 * Demo Data for Live Sandbox
 * Production-ready demo data generator
 */

export interface DemoLocation {
  id: string
  name: string
  address: string
  rating: number
  totalReviews: number
  responseRate: number
  status: 'active' | 'pending' | 'suspended'
  category: string
}

export interface DemoReview {
  id: string
  locationId: string
  locationName: string
  reviewerName: string
  rating: number
  text: string
  createdAt: string
  reply?: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

export interface DemoPost {
  id: string
  locationId: string
  locationName: string
  title: string
  content: string
  media?: string
  scheduledAt: string
  status: 'published' | 'scheduled' | 'draft'
}

export interface DemoStats {
  totalLocations: number
  totalReviews: number
  averageRating: number
  responseRate: number
  pendingReviews: number
  thisMonthReviews: number
  lastMonthReviews: number
  growthRate: number
}

// Demo Locations
export const demoLocations: DemoLocation[] = [
  {
    id: 'loc-1',
    name: 'المطعم الرئيسي - وسط المدينة',
    address: 'شارع الملك فهد، الرياض',
    rating: 4.8,
    totalReviews: 342,
    responseRate: 98,
    status: 'active',
    category: 'restaurant'
  },
  {
    id: 'loc-2',
    name: 'الفرع الشمالي',
    address: 'حي النرجس، الرياض',
    rating: 4.6,
    totalReviews: 156,
    responseRate: 85,
    status: 'active',
    category: 'restaurant'
  },
  {
    id: 'loc-3',
    name: 'فرع الشرقية',
    address: 'الكورنيش، الدمام',
    rating: 4.9,
    totalReviews: 89,
    responseRate: 100,
    status: 'active',
    category: 'restaurant'
  },
  {
    id: 'loc-4',
    name: 'فرع جدة',
    address: 'طريق الملك عبدالعزيز، جدة',
    rating: 4.5,
    totalReviews: 234,
    responseRate: 92,
    status: 'active',
    category: 'restaurant'
  }
]

// Demo Reviews
export const demoReviews: DemoReview[] = [
  {
    id: 'rev-1',
    locationId: 'loc-1',
    locationName: 'المطعم الرئيسي',
    reviewerName: 'أحمد محمد',
    rating: 5,
    text: 'تجربة رائعة! الطعام لذيذ والخدمة ممتازة. أنصح الجميع بزيارة المطعم.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sentiment: 'positive'
  },
  {
    id: 'rev-2',
    locationId: 'loc-1',
    locationName: 'المطعم الرئيسي',
    reviewerName: 'سارة أحمد',
    rating: 2,
    text: 'الانتظار طويل جداً وجودة الطعام ليست كما كانت من قبل. أتمنى التحسين.',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'negative'
  },
  {
    id: 'rev-3',
    locationId: 'loc-2',
    locationName: 'الفرع الشمالي',
    reviewerName: 'محمد علي',
    rating: 5,
    text: 'مكان نظيف وموظفين محترمين. الأسعار معقولة والطعام طازج.',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    reply: 'شكراً لك على كلماتك الطيبة! نسعد دائماً بخدمتك 🌟',
    sentiment: 'positive'
  },
  {
    id: 'rev-4',
    locationId: 'loc-3',
    locationName: 'فرع الشرقية',
    reviewerName: 'فاطمة خالد',
    rating: 4,
    text: 'جيد بشكل عام، لكن يحتاج المكان لتوسعة لأنه مزدحم دائماً.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    sentiment: 'positive'
  },
  {
    id: 'rev-5',
    locationId: 'loc-1',
    locationName: 'المطعم الرئيسي',
    reviewerName: 'عبدالله سعيد',
    rating: 5,
    text: 'أفضل مطعم في المدينة! الشيف محترف والديكور راقي.',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reply: 'نشكرك على ثقتك بنا! نتطلع لاستقبالك مجدداً 🙏',
    sentiment: 'positive'
  }
]

// Demo Posts
export const demoPosts: DemoPost[] = [
  {
    id: 'post-1',
    locationId: 'loc-1',
    locationName: 'المطعم الرئيسي',
    title: 'عرض خاص للعطلة الأسبوعية!',
    content: '🎉 خصم 25% على جميع الوجبات يومي الجمعة والسبت! احجز طاولتك الآن.',
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled'
  },
  {
    id: 'post-2',
    locationId: 'loc-2',
    locationName: 'الفرع الشمالي',
    title: 'افتتاح قسم العائلات الجديد',
    content: 'نسعد بإعلان افتتاح قسم العائلات المجدد مع ديكور عصري وخدمة مميزة! 🏠✨',
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published'
  },
  {
    id: 'post-3',
    locationId: 'loc-3',
    locationName: 'فرع الشرقية',
    title: 'قائمة جديدة للمأكولات البحرية',
    content: 'جرب قائمتنا الجديدة من المأكولات البحرية الطازجة! 🦐🐟',
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled'
  }
]

// Demo Stats
export const demoStats: DemoStats = {
  totalLocations: 4,
  totalReviews: 821,
  averageRating: 4.7,
  responseRate: 94,
  pendingReviews: 2,
  thisMonthReviews: 89,
  lastMonthReviews: 67,
  growthRate: 32.8
}

// AI Response Generator (simulated)
export function generateAIResponse(review: DemoReview): string {
  if (review.sentiment === 'positive') {
    const positiveResponses = [
      `شكراً جزيلاً ${review.reviewerName} على كلماتك الطيبة! نسعد دائماً بخدمتك ونتطلع لاستقبالك مجدداً 🌟`,
      `نقدر تقييمك الرائع ${review.reviewerName}! فريقنا يعمل بجد لتقديم أفضل تجربة لك 💫`,
      `يسعدنا أنك استمتعت بزيارتك ${review.reviewerName}! نحن دائماً في خدمتك 🙏`,
    ]
    return positiveResponses[Math.floor(Math.random() * positiveResponses.length)]
  } else if (review.sentiment === 'negative') {
    return `نعتذر بشدة عن التجربة السيئة ${review.reviewerName}. نأخذ ملاحظاتك على محمل الجد وسنعمل على تحسين خدماتنا فوراً. يرجى التواصل معنا مباشرة لنعوضك عن هذه التجربة. 🙏`
  } else {
    return `شكراً على ملاحظاتك ${review.reviewerName}! نقدر وقتك ونسعى دائماً للتحسين المستمر 🌟`
  }
}

// Sentiment Analysis (simulated)
export function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['رائع', 'ممتاز', 'جيد', 'لذيذ', 'نظيف', 'محترف', 'أفضل', 'طازج', 'راقي']
  const negativeWords = ['سيء', 'طويل', 'ليس', 'أتمنى', 'مزدحم', 'بطيء']
  
  const lowerText = text.toLowerCase()
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length
  
  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

// Generate random activity
export function generateRandomActivity(): string {
  const activities = [
    'أحمد من الرياض سجل للتو!',
    'سارة من دبي ربطت 5 مواقع!',
    'محمد من القاهرة حصل على +150 تقييم!',
    'فاطمة من جدة استخدمت AI Reply!',
    'عبدالله من الدمام أنشأ 3 منشورات!',
    'نورة من الكويت حسنت تقييمها إلى 4.8⭐',
    'خالد من عمان وفر 40 ساعة هذا الشهر!',
    'ليلى من بيروت ردت على 50 تقييم!',
  ]
  return activities[Math.floor(Math.random() * activities.length)]
}

// Time ago formatter
export function timeAgo(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'الآن'
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  return `منذ ${diffDays} يوم`
}

