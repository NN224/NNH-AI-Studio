// Dashboard Types - Centralized type definitions
export interface DashboardStats {
  response_rate_percent: number
  reviews_count: number
  average_rating: number
  replied_reviews_count: number
  locations_count: number
  accounts_count: number
  today_reviews_count: number
  weekly_growth: number
  reviews_trend: number[]
  youtube_subs: string | null
  has_youtube: boolean
  has_accounts: boolean
  streak: number
}

export interface LocationWithGMBAccount {
  id: string
  user_id: string
  location_name: string
  location_id: string
  address: string | null
  phone: string | null
  website: string | null
  is_active: boolean
  metadata: Record<string, unknown>
  gmb_accounts: {
    id: string
    user_id: string
    access_token: string
    refresh_token: string
    token_expires_at: string
  }
}

export interface TokenRefreshResult {
  access_token: string
  expires_in: number
  refresh_token?: string
}

export interface DashboardError extends Error {
  code?: string
  context?: Record<string, unknown>
}

export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

// RPC Function Types
export interface GetUserDashboardStatsParams {
  p_user_id: string
}

export interface RefreshTokenParams {
  locationId: string
  forceRefresh?: boolean
}

// Action Result Types
export interface RefreshTokenActionResult {
  success: boolean
  message: string
  newToken?: string
  expiresAt?: string
}

export interface DashboardDataResult {
  stats: DashboardStats
  totalLocations: number
  hasMore: boolean
  lastUpdated: string
}
