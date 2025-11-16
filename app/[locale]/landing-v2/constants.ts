/**
 * Landing Page V2 Constants
 * Production-ready configuration
 */

import { 
  Store, Hotel, Hospital, Building2, ShoppingBag, Wrench,
  MessageSquare, BarChart3, Sparkles, MapPin, FileText, Users
} from 'lucide-react'
import type { BusinessTypeOption, LocationCountOption, ChallengeOption } from './types'

export const BUSINESS_TYPES: BusinessTypeOption[] = [
  {
    id: 'restaurant',
    label: 'مطعم',
    labelEn: 'Restaurant',
    icon: 'Store',
    description: 'مطاعم، كافيهات، مخابز',
    descriptionEn: 'Restaurants, Cafes, Bakeries'
  },
  {
    id: 'hotel',
    label: 'فندق',
    labelEn: 'Hotel',
    icon: 'Hotel',
    description: 'فنادق، منتجعات، شقق فندقية',
    descriptionEn: 'Hotels, Resorts, Serviced Apartments'
  },
  {
    id: 'clinic',
    label: 'عيادة',
    labelEn: 'Clinic',
    icon: 'Hospital',
    description: 'عيادات، مستشفيات، مراكز طبية',
    descriptionEn: 'Clinics, Hospitals, Medical Centers'
  },
  {
    id: 'retail',
    label: 'متجر',
    labelEn: 'Retail',
    icon: 'ShoppingBag',
    description: 'متاجر، محلات، مولات',
    descriptionEn: 'Stores, Shops, Malls'
  },
  {
    id: 'service',
    label: 'خدمات',
    labelEn: 'Services',
    icon: 'Wrench',
    description: 'صالونات، ورش، خدمات',
    descriptionEn: 'Salons, Workshops, Services'
  },
  {
    id: 'other',
    label: 'آخر',
    labelEn: 'Other',
    icon: 'Building2',
    description: 'أعمال أخرى',
    descriptionEn: 'Other Businesses'
  }
]

export const LOCATION_COUNTS: LocationCountOption[] = [
  {
    id: '1',
    label: '1 فرع',
    labelEn: '1 Location',
    recommendedPlan: 'free'
  },
  {
    id: '2-5',
    label: '2-5 فروع',
    labelEn: '2-5 Locations',
    recommendedPlan: 'pro'
  },
  {
    id: '6-20',
    label: '6-20 فرع',
    labelEn: '6-20 Locations',
    recommendedPlan: 'agency'
  },
  {
    id: '20+',
    label: '20+ فرع',
    labelEn: '20+ Locations',
    recommendedPlan: 'agency'
  }
]

export const CHALLENGES: ChallengeOption[] = [
  {
    id: 'reviews',
    label: 'إدارة التقييمات',
    labelEn: 'Review Management',
    icon: 'MessageSquare',
    description: 'صعوبة في الرد على التقييمات',
    descriptionEn: 'Difficulty responding to reviews',
    solution: 'AI Replies + Sentiment Analysis',
    solutionEn: 'AI Replies + Sentiment Analysis'
  },
  {
    id: 'analytics',
    label: 'تحليل الأداء',
    labelEn: 'Performance Analytics',
    icon: 'BarChart3',
    description: 'عدم وضوح الأداء والإحصائيات',
    descriptionEn: 'Unclear performance metrics',
    solution: 'Advanced Analytics Dashboard',
    solutionEn: 'Advanced Analytics Dashboard'
  },
  {
    id: 'automation',
    label: 'أتمتة الردود',
    labelEn: 'Automation',
    icon: 'Sparkles',
    description: 'وقت كثير في الردود اليدوية',
    descriptionEn: 'Too much time on manual responses',
    solution: 'AI Automation + Smart Templates',
    solutionEn: 'AI Automation + Smart Templates'
  },
  {
    id: 'locations',
    label: 'إدارة المواقع',
    labelEn: 'Multi-Location Management',
    icon: 'MapPin',
    description: 'صعوبة إدارة فروع متعددة',
    descriptionEn: 'Difficulty managing multiple locations',
    solution: 'Centralized Multi-Location Dashboard',
    solutionEn: 'Centralized Multi-Location Dashboard'
  },
  {
    id: 'content',
    label: 'إنشاء المحتوى',
    labelEn: 'Content Creation',
    icon: 'FileText',
    description: 'صعوبة في كتابة المنشورات',
    descriptionEn: 'Difficulty creating posts',
    solution: 'AI Content Generator',
    solutionEn: 'AI Content Generator'
  },
  {
    id: 'team',
    label: 'إدارة الفريق',
    labelEn: 'Team Management',
    icon: 'Users',
    description: 'تنسيق الفريق والصلاحيات',
    descriptionEn: 'Team coordination and permissions',
    solution: 'Team Collaboration Tools',
    solutionEn: 'Team Collaboration Tools'
  }
]

export const ICON_MAP = {
  Store,
  Hotel,
  Hospital,
  Building2,
  ShoppingBag,
  Wrench,
  MessageSquare,
  BarChart3,
  Sparkles,
  MapPin,
  FileText,
  Users
}

export const PLAN_FEATURES = {
  free: {
    price: 0,
    features: [
      'حتى 3 مواقع',
      'Analytics أساسي',
      'مراقبة التقييمات',
      'دعم عبر البريد'
    ],
    featuresEn: [
      'Up to 3 locations',
      'Basic analytics',
      'Review monitoring',
      'Email support'
    ]
  },
  pro: {
    price: 49,
    features: [
      'حتى 25 موقع',
      'Analytics متقدم',
      'AI Replies للتقييمات',
      'دعم أولوية',
      'تقارير مخصصة',
      'أتمتة كاملة'
    ],
    featuresEn: [
      'Up to 25 locations',
      'Advanced analytics',
      'AI-powered responses',
      'Priority support',
      'Custom reports',
      'Full automation'
    ]
  },
  agency: {
    price: 149,
    features: [
      'مواقع غير محدودة',
      'White-label',
      'تعاون الفريق',
      'مدير حساب مخصص',
      'API access',
      'تدريب مخصص'
    ],
    featuresEn: [
      'Unlimited locations',
      'White-label solution',
      'Team collaboration',
      'Dedicated account manager',
      'API access',
      'Custom training'
    ]
  }
}

export const BENEFITS_BY_BUSINESS = {
  restaurant: {
    timeSaved: '40 ساعة/شهر',
    visibilityIncrease: '+150%',
    responseRate: '100%',
    roi: '+200%'
  },
  hotel: {
    timeSaved: '60 ساعة/شهر',
    visibilityIncrease: '+180%',
    responseRate: '100%',
    roi: '+250%'
  },
  clinic: {
    timeSaved: '30 ساعة/شهر',
    visibilityIncrease: '+120%',
    responseRate: '100%',
    roi: '+180%'
  },
  retail: {
    timeSaved: '35 ساعة/شهر',
    visibilityIncrease: '+140%',
    responseRate: '100%',
    roi: '+190%'
  },
  service: {
    timeSaved: '45 ساعة/شهر',
    visibilityIncrease: '+160%',
    responseRate: '100%',
    roi: '+210%'
  },
  other: {
    timeSaved: '40 ساعة/شهر',
    visibilityIncrease: '+150%',
    responseRate: '100%',
    roi: '+200%'
  }
}

