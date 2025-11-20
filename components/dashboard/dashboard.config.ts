/**
 * Dashboard Configuration
 * 
 * مركز للتحكم في إعدادات وميزات Dashboard
 */

export const dashboardConfig = {
  // Feature Flags
  features: {
    realtime: true,
    animations: true,
    darkMode: true,
    pdfExport: true,
    autoRefresh: true,
  },

  // Refresh Settings
  refresh: {
    manual: true,
    auto: false,
    autoInterval: 30000, // 30 seconds
    showToast: true,
  },

  // Real-time Settings
  realtime: {
    enabled: true,
    channels: {
      reviews: true,
      locations: true,
      activities: true,
    },
    reconnectAttempts: 3,
    reconnectDelay: 1000,
  },

  // Animation Settings
  animations: {
    enabled: true,
    duration: 300,
    staggerDelay: 100,
    easing: 'easeOut',
  },

  // Widget Settings
  widgets: {
    stats: {
      count: 4,
      showBadges: true,
    },
    reviews: {
      limit: 5,
      showEmpty: true,
      truncateText: 120,
    },
    locations: {
      limit: 5,
      showEmpty: true,
      showRating: true,
    },
    activities: {
      limit: 5,
      showEmpty: true,
    },
  },

  // Skeleton Settings
  skeletons: {
    enabled: true,
    count: {
      stats: 4,
      widgets: 3,
    },
  },

  // Error Handling
  errorHandling: {
    showDetails: process.env.NODE_ENV === 'development',
    showResetButton: true,
    logErrors: true,
  },

  // PDF Export Settings
  pdfExport: {
    enabled: true,
    method: 'data', // 'data' or 'styled'
    format: 'a4',
    orientation: 'portrait',
    includeCharts: false,
  },

  // Theme Settings
  theme: {
    enabled: true,
    defaultTheme: 'system', // 'light' | 'dark' | 'system'
    storageKey: 'dashboard-theme',
  },

  // Performance Settings
  performance: {
    lazy: true,
    suspense: true,
    memoization: true,
    debounceRefresh: 1000,
  },

  // UI Settings
  ui: {
    showHeader: true,
    showFooter: false,
    containerMaxWidth: '1400px',
    spacing: 'lg', // 'sm' | 'md' | 'lg'
  },
} as const

// Type exports
export type DashboardConfig = typeof dashboardConfig
export type WidgetType = keyof typeof dashboardConfig.widgets

// Helper functions
export function isFeatureEnabled(feature: keyof typeof dashboardConfig.features) {
  return dashboardConfig.features[feature]
}

export function getWidgetLimit(widget: WidgetType) {
  const config = dashboardConfig.widgets[widget];
  if ('limit' in config) {
    return config.limit;
  }
  if ('count' in config) {
    return config.count;
  }
  return 5; // default fallback
}

export function getAnimationDuration() {
  return dashboardConfig.animations.enabled 
    ? dashboardConfig.animations.duration 
    : 0
}

export function shouldShowErrors() {
  return dashboardConfig.errorHandling.showDetails
}
