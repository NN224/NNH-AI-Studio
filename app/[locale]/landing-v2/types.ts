/**
 * Landing Page V2 Types
 * Production-ready type definitions
 */

export type InteractiveStep = 
  | 'welcome' 
  | 'business-type' 
  | 'locations' 
  | 'challenge' 
  | 'result'

export interface UserPreferences {
  businessType?: BusinessType
  locationCount?: LocationCount
  challenge?: Challenge
  timestamp: number
}

export type BusinessType = 'restaurant' | 'hotel' | 'clinic' | 'retail' | 'service' | 'other'

export type LocationCount = '1' | '2-5' | '6-20' | '20+'

export type Challenge = 'reviews' | 'analytics' | 'automation' | 'locations' | 'content' | 'team'

export interface BusinessTypeOption {
  id: BusinessType
  label: string
  labelEn: string
  icon: string
  description: string
  descriptionEn: string
}

export interface LocationCountOption {
  id: LocationCount
  label: string
  labelEn: string
  recommendedPlan: 'free' | 'pro' | 'agency'
}

export interface ChallengeOption {
  id: Challenge
  label: string
  labelEn: string
  icon: string
  description: string
  descriptionEn: string
  solution: string
  solutionEn: string
}

export interface PersonalizedResult {
  plan: 'free' | 'pro' | 'agency'
  price: number
  features: string[]
  benefits: {
    timeSaved: string
    visibilityIncrease: string
    responseRate: string
    roi: string
  }
  recommendations: string[]
}

