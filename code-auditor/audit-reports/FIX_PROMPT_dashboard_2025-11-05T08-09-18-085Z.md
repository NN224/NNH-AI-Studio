# 🔧 Code Fix Instructions for AI Agent

## Project Context
- **Project**: NNH AI Studio - GMB Dashboard  
- **Component**: dashboard
- **Framework**: Next.js 14, TypeScript, Supabase, TailwindCSS

## Your Mission
Review the audit report below and apply appropriate fixes to the codebase.

## Audit Report

```json
{
  "summary": "The dashboard component system shows a complex multi-page architecture with significant security, performance, and data handling issues. Critical concerns include missing authentication checks, potential data leaks through unvalidated API responses, race conditions in real-time updates, and performance bottlenecks from excessive re-renders and unoptimized queries. The codebase lacks proper error boundaries, has accessibility gaps, and shows inconsistent state management patterns.",

  "critical": [
    {
      "issue": "Missing Authentication Validation",
      "description": "API route `/api/dashboard/stats/route.ts` lacks proper authentication checks before returning sensitive business data. User session validation is not implemented consistently across dashboard components.",
      "impact": "Unauthorized users could access sensitive business metrics and location data",
      "location": "app/api/dashboard/stats/route.ts, multiple dashboard components"
    },
    {
      "issue": "Race Conditions in Real-time Updates",
      "description": "The `realtime-updates-indicator.tsx` and `activity-feed.tsx` components have multiple concurrent state updates without proper synchronization, leading to inconsistent UI state.",
      "impact": "Data corruption, incorrect metrics display, potential crashes",
      "location": "components/dashboard/realtime-updates-indicator.tsx, components/dashboard/activity-feed.tsx"
    },
    {
      "issue": "Unvalidated Data Exposure",
      "description": "Dashboard components directly render API responses without sanitization or validation, creating XSS vulnerabilities and potential data leaks through error messages.",
      "impact": "Cross-site scripting attacks, sensitive data exposure",
      "location": "Multiple dashboard components, especially gmb-posts-section.tsx"
    },
    {
      "issue": "Memory Leaks in Chart Components",
      "description": "Performance charts (`performance-chart.tsx`, `performance-comparison-chart.tsx`) don't properly cleanup event listeners and intervals on unmount.",
      "impact": "Progressive memory consumption, browser crashes on long sessions",
      "location": "components/dashboard/performance-chart.tsx, components/dashboard/performance-comparison-chart.tsx"
    },
    {
      "issue": "Insecure Data Fetching Pattern",
      "description": "Multiple components fetch data without CSRF protection and use client-side API calls that expose internal endpoints.",
      "impact": "CSRF attacks, API endpoint enumeration, unauthorized data access",
      "location": "Throughout dashboard components making API calls"
    }
  ],

  "high": [
    {
      "issue": "Poor Error Handling Strategy",
      "description": "Error boundaries are inconsistently implemented. Many components fail silently or show generic error messages without proper logging.",
      "impact": "Poor user experience, difficult debugging, hidden failures",
      "location": "components/dashboard/dashboard-error-boundary.tsx, multiple components"
    },
    {
      "issue": "Accessibility Violations",
      "description": "Missing ARIA labels, keyboard navigation support, and screen reader compatibility across interactive dashboard elements.",
      "impact": "Excludes users with disabilities, potential legal compliance issues",
      "location": "Most interactive components, especially charts and controls"
    },
    {
      "issue": "Unoptimized Database Queries",
      "description": "API route performs multiple sequential database queries without batching or caching, causing performance bottlenecks.",
      "impact": "Slow dashboard load times, increased database load, poor user experience",
      "location": "app/api/dashboard/stats/route.ts"
    },
    {
      "issue": "Excessive Re-renders",
      "description": "Components like `stats-cards.tsx` and `performance-snapshot.tsx` lack proper memoization, causing unnecessary re-renders on every state change.",
      "impact": "Poor performance, battery drain on mobile devices",
      "location": "components/dashboard/stats-cards.tsx, components/dashboard/performance-snapshot.tsx"
    },
    {
      "issue": "Inconsistent Loading States",
      "description": "Loading states are handled differently across components, some components show no loading indication while fetching data.",
      "impact": "Poor user experience, perceived slowness",
      "location": "Multiple dashboard components"
    },
    {
      "issue": "Large Bundle Size",
      "description": "Dashboard loads all components upfront despite having lazy loading infrastructure. Components are not properly code-split.",
      "impact": "Slow initial page load, poor mobile experience",
      "location": "components/dashboard/lazy-dashboard-components.tsx, main dashboard pages"
    }
  ],

  "recommendations": [
    {
      "priority": "Critical",
      "action": "Implement comprehensive authentication middleware",
      "description": "Add authentication checks to all API routes and implement session validation in dashboard components. Use Next.js middleware for route protection."
    },
    {
      "priority": "Critical", 
      "action": "Add input validation and sanitization",
      "description": "Implement Zod schemas for all API inputs/outputs and sanitize all rendered content using DOMPurify or similar."
    },
    {
      "priority": "Critical",
      "action": "Fix race conditions with proper state management",
      "description": "Implement proper state synchronization using useCallback, useMemo, and consider using a state management library like Zustand for complex state."
    },
    {
      "priority": "High",
      "action": "Optimize database queries with batching and caching",
      "description": "Implement query batching, add Redis caching layer, and use Supabase's batch query capabilities. Consider implementing SWR or React Query for client-side caching."
    },
    {
      "priority": "High",
      "action": "Implement proper error boundaries and logging",
      "description": "Add granular error boundaries for each dashboard section, implement structured logging with error tracking service (Sentry), and provide meaningful error messages."
    },
    {
      "priority": "High",
      "action": "Add comprehensive accessibility features",
      "description": "Implement ARIA labels, keyboard navigation, focus management, and screen reader support. Add accessibility testing to CI pipeline."
    },
    {
      "priority": "Medium",
      "action": "Optimize component performance",
      "description": "Add React.memo, useMemo, and useCallback where appropriate. Implement virtual scrolling for large lists and optimize chart rendering."
    },
    {
      "priority": "Medium",
      "action": "Implement proper code splitting",
      "description": "Use Next.js dynamic imports for dashboard sections, implement route-based code splitting, and lazy load non-critical components."
    },
    {
      "priority": "Medium",
      "action": "Standardize loading and error states",
      "description": "Create reusable loading and error state components, implement skeleton screens for better perceived performance."
    },
    {
      "priority": "Low",
      "action": "Add comprehensive TypeScript types",
      "description": "Define proper interfaces for all API responses and component props, eliminate any usage, and add strict type checking."
    }
  ],

  "filesAffected": [
    "app/api/dashboard/stats/route.ts",
    "components/dashboard/realtime-updates-indicator.tsx",
    "components/dashboard/activity-feed.tsx", 
    "components/dashboard/gmb-posts-section.tsx",
    "components/dashboard/performance-chart.tsx",
    "components/dashboard/performance-comparison-chart.tsx",
    "components/dashboard/dashboard-error-boundary.tsx",
    "components/dashboard/stats-cards.tsx",
    "components/dashboard/performance-snapshot.tsx",
    "components/dashboard/lazy-dashboard-components.tsx",
    "app/[locale]/(dashboard)/dashboard/page.tsx",
    "app/[locale]/(dashboard)/dashboard/optimized-page.tsx",
    "components/dashboard/ai-copilot-enhanced.tsx",
    "components/dashboard/ai-insights-card.tsx",
    "components/dashboard/weekly-tasks-widget.tsx"
  ]
}
```

## Instructions

1. **Analyze** the issues identified in the report
2. **Prioritize** fixes: Critical → High → Medium → Low
3. **Apply** fixes one at a time
4. **Test** after each fix to ensure nothing breaks
5. **Commit** with descriptive messages

## Expected Output Format

For each fix, provide:

```json
{
  "file": "path/to/file.tsx",
  "description": "What you fixed",
  "changes": {
    "before": "old code snippet",
    "after": "new code snippet"
  },
  "reasoning": "Why this fix is needed",
  "testing": "How to verify the fix works"
}
```

---

**Generated by**: NNH Code Auditor Extension
**Powered by**: Claude Sonnet 4.5