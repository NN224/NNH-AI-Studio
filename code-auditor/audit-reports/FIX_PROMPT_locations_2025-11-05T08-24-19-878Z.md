# 🔧 Code Fix Instructions for AI Agent

## Project Context
- **Project**: NNH AI Studio - GMB Dashboard  
- **Component**: locations
- **Framework**: Next.js 14, TypeScript, Supabase, TailwindCSS

## Your Mission
Review the audit report below and apply appropriate fixes to the codebase.

## Audit Report

```json
{
  "summary": "The locations component system has several critical security vulnerabilities including missing authorization checks in API routes, potential race conditions in bulk operations, and data exposure risks. The codebase shows good structure with error boundaries and lazy loading, but suffers from performance issues with inefficient queries, missing loading states, and accessibility gaps.",
  
  "critical": [
    {
      "issue": "Missing Authorization in API Routes",
      "description": "API routes like bulk-publish, competitor-data, and image upload routes lack proper authorization checks, allowing unauthorized access to location data and operations",
      "files": ["app/api/locations/bulk-publish/route.ts", "app/api/locations/competitor-data/route.ts", "app/api/locations/[locationId]/cover/route.ts", "app/api/locations/[locationId]/logo/route.ts"],
      "impact": "Data breach, unauthorized modifications"
    },
    {
      "issue": "Race Conditions in Bulk Operations",
      "description": "Bulk publish operations process multiple locations concurrently without proper synchronization, potentially causing data inconsistency",
      "files": ["app/api/locations/bulk-publish/route.ts"],
      "impact": "Data corruption, inconsistent state"
    },
    {
      "issue": "Unvalidated File Uploads",
      "description": "Image upload endpoints lack proper file validation, size limits, and type checking",
      "files": ["app/api/locations/[locationId]/cover/route.ts", "app/api/locations/[locationId]/logo/route.ts"],
      "impact": "Security vulnerability, potential malware upload"
    },
    {
      "issue": "SQL Injection Potential",
      "description": "Dynamic query building in list-data and map-data routes may be vulnerable to SQL injection if user input isn't properly sanitized",
      "files": ["app/api/locations/list-data/route.ts", "app/api/locations/map-data/route.ts"],
      "impact": "Database compromise"
    }
  ],
  
  "high": [
    {
      "issue": "Poor Error Handling in API Routes",
      "description": "API routes return generic 500 errors without proper error logging or user-friendly messages",
      "files": ["app/api/locations/bulk-publish/route.ts", "app/api/locations/competitor-data/route.ts"],
      "impact": "Poor user experience, difficult debugging"
    },
    {
      "issue": "Missing Loading States",
      "description": "Many components lack proper loading states during async operations, causing poor UX",
      "files": ["components/locations/locations-list.tsx", "components/locations/location-card.tsx"],
      "impact": "Poor user experience"
    },
    {
      "issue": "Accessibility Issues",
      "description": "Missing ARIA labels, keyboard navigation support, and screen reader compatibility in interactive components",
      "files": ["components/locations/location-filters.tsx", "components/locations/LocationMapDashboard.tsx"],
      "impact": "Excludes users with disabilities"
    },
    {
      "issue": "Inefficient Query Patterns",
      "description": "N+1 query problems and missing database indexes for location filtering and searching",
      "files": ["app/api/locations/list-data/route.ts", "components/locations/locations-list.tsx"],
      "impact": "Poor performance, high database load"
    },
    {
      "issue": "Memory Leaks in Map Component",
      "description": "Google Maps instances and event listeners not properly cleaned up on component unmount",
      "files": ["components/locations/LocationMapDashboard.tsx", "components/locations/locations-map-view.tsx"],
      "impact": "Performance degradation, browser crashes"
    }
  ],
  
  "recommendations": [
    {
      "category": "Security",
      "items": [
        "Implement proper authentication middleware for all API routes",
        "Add input validation and sanitization using libraries like Zod",
        "Implement file upload validation with type checking and size limits",
        "Add rate limiting to prevent abuse of bulk operations",
        "Use parameterized queries or ORM methods to prevent SQL injection"
      ]
    },
    {
      "category": "Performance",
      "items": [
        "Implement database indexes for frequently queried location fields",
        "Add pagination to location lists and implement virtual scrolling",
        "Use React.memo and useMemo for expensive calculations",
        "Implement proper cleanup in useEffect hooks for map components",
        "Add request caching for frequently accessed location data"
      ]
    },
    {
      "category": "User Experience",
      "items": [
        "Add comprehensive loading states with skeleton components",
        "Implement optimistic updates for better perceived performance",
        "Add proper error boundaries with retry mechanisms",
        "Implement keyboard navigation for all interactive elements",
        "Add ARIA labels and roles for screen reader compatibility"
      ]
    },
    {
      "category": "Code Quality",
      "items": [
        "Extract common logic into custom hooks",
        "Implement proper TypeScript interfaces for all data structures",
        "Add comprehensive error logging with context",
        "Use consistent naming conventions across components",
        "Implement proper form validation with user-friendly error messages"
      ]
    }
  ],
  
  "filesAffected": [
    "app/api/locations/bulk-publish/route.ts",
    "app/api/locations/competitor-data/route.ts", 
    "app/api/locations/[locationId]/cover/route.ts",
    "app/api/locations/[locationId]/logo/route.ts",
    "app/api/locations/list-data/route.ts",
    "app/api/locations/map-data/route.ts",
    "components/locations/LocationMapDashboard.tsx",
    "components/locations/locations-list.tsx",
    "components/locations/location-card.tsx",
    "components/locations/location-filters.tsx",
    "components/locations/locations-map-view.tsx",
    "components/locations/add-location-dialog.tsx",
    "components/locations/edit-location-dialog.tsx"
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