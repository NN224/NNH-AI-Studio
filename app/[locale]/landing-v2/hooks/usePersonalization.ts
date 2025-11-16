/**
 * Personalization Hook
 * Manages user preferences and personalized recommendations
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserPreferences, PersonalizedResult, BusinessType, LocationCount, Challenge } from '../types'
import { PLAN_FEATURES, BENEFITS_BY_BUSINESS, LOCATION_COUNTS } from '../constants'

const STORAGE_KEY = 'nnh_user_preferences'
const EXPIRY_DAYS = 30

export function usePersonalization() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences
        
        // Check if expired (30 days)
        const now = Date.now()
        const age = now - parsed.timestamp
        const maxAge = EXPIRY_DAYS * 24 * 60 * 60 * 1000
        
        if (age < maxAge) {
          setPreferences(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    try {
      const updated: UserPreferences = {
        ...preferences,
        ...prefs,
        timestamp: Date.now()
      }
      
      setPreferences(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      
      // Track event (if analytics is available)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'personalization_update', {
          business_type: updated.businessType,
          location_count: updated.locationCount,
          challenge: updated.challenge
        })
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }, [preferences])

  // Clear preferences
  const clearPreferences = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setPreferences(null)
    } catch (error) {
      console.error('Failed to clear preferences:', error)
    }
  }, [])

  // Get personalized result
  const getPersonalizedResult = useCallback((): PersonalizedResult | null => {
    if (!preferences?.businessType || !preferences?.locationCount || !preferences?.challenge) {
      return null
    }

    // Determine recommended plan
    const locationOption = LOCATION_COUNTS.find(l => l.id === preferences.locationCount)
    const plan = locationOption?.recommendedPlan || 'pro'

    // Get plan features
    const planFeatures = PLAN_FEATURES[plan]

    // Get benefits based on business type
    const benefits = BENEFITS_BY_BUSINESS[preferences.businessType]

    // Generate recommendations based on challenge
    const recommendations = generateRecommendations(
      preferences.businessType,
      preferences.locationCount,
      preferences.challenge
    )

    return {
      plan,
      price: planFeatures.price,
      features: planFeatures.features,
      benefits,
      recommendations
    }
  }, [preferences])

  return {
    preferences,
    isLoading,
    savePreferences,
    clearPreferences,
    getPersonalizedResult
  }
}

function generateRecommendations(
  businessType: BusinessType,
  locationCount: LocationCount,
  challenge: Challenge
): string[] {
  const recommendations: string[] = []

  // Based on challenge
  switch (challenge) {
    case 'reviews':
      recommendations.push(
        'فعّل AI Auto-Reply للرد التلقائي',
        'استخدم Sentiment Analysis لتحديد الأولويات',
        'أنشئ قوالب ردود مخصصة'
      )
      break
    case 'analytics':
      recommendations.push(
        'راجع Dashboard يومياً',
        'تابع KPIs الرئيسية',
        'صدّر تقارير أسبوعية'
      )
      break
    case 'automation':
      recommendations.push(
        'فعّل Automation Rules',
        'اضبط AI Settings',
        'جدول المنشورات مسبقاً'
      )
      break
    case 'locations':
      recommendations.push(
        'استخدم Bulk Actions',
        'أنشئ Location Groups',
        'فعّل Centralized Management'
      )
      break
    case 'content':
      recommendations.push(
        'استخدم AI Content Generator',
        'أنشئ Content Calendar',
        'احفظ Templates للاستخدام المتكرر'
      )
      break
    case 'team':
      recommendations.push(
        'أضف Team Members',
        'اضبط Roles & Permissions',
        'فعّل Approval Workflow'
      )
      break
  }

  // Based on location count
  if (locationCount === '20+') {
    recommendations.push(
      'تواصل مع فريق المبيعات للحصول على خطة مخصصة',
      'اطلب Enterprise Features'
    )
  }

  // Based on business type
  if (businessType === 'restaurant') {
    recommendations.push(
      'أضف صور للأطباق بانتظام',
      'رد على تقييمات الطعام بسرعة'
    )
  } else if (businessType === 'hotel') {
    recommendations.push(
      'حدّث صور الغرف والمرافق',
      'رد على استفسارات الحجز فوراً'
    )
  }

  return recommendations.slice(0, 5) // Max 5 recommendations
}

