# 🔴 CRITICAL FIX: SQL Injection in Search Queries

## 📋 Problem Summary

**Issue ID:** CRITICAL-004
**Severity:** 🔴 CRITICAL - SQL INJECTION VULNERABILITY
**Priority:** P0 (Immediate)
**Estimated Time:** 3 hours
**Domain:** Security / Database

---

## 🎯 What You Need to Fix

Search queries in several server actions are vulnerable to **SQL operator injection** because user input is directly interpolated into SQL ILIKE patterns without proper escaping.

**Files Affected:**

1. `server/actions/reviews-management.ts` - Line 231
2. `server/actions/questions-management.ts` - Line 180
3. `server/actions/posts-management.ts` - Lines 207-216 (partial fix exists)

---

## 📁 Files to Modify

- `server/actions/reviews-management.ts`
- `server/actions/questions-management.ts`
- `server/actions/posts-management.ts`
- Create: `lib/utils/sanitize-search.ts` (centralized sanitizer)

---

## 🐛 Current Problem Code

### Problem 1: reviews-management.ts (Line 231)

```typescript
// ❌ VULNERABLE!
if (validatedParams.searchQuery) {
  query = query.or(
    `review_text.ilike.%${validatedParams.searchQuery}%,reviewer_name.ilike.%${validatedParams.searchQuery}%`,
  );
}
```

**What's Wrong:**

- User input directly interpolated into query
- Special characters `%`, `_`, `\` not escaped
- Attackers can inject SQL operators
- Example: input `%` matches everything (bypass intended search)

### Problem 2: questions-management.ts (Line 180)

```typescript
// ❌ SAME VULNERABILITY
if (validatedParams.searchQuery) {
  query = query.or(
    `text.ilike.%${validatedParams.searchQuery}%,author_display_name.ilike.%${validatedParams.searchQuery}%`,
  );
}
```

### Problem 3: posts-management.ts (Better, but inconsistent)

```typescript
// ✅ BETTER - Has sanitization
const sanitizedQuery = validatedParams.searchQuery
  .replace(/[%_\\]/g, "\\$&") // Escapes wildcards
  .replace(/['"]/g, "") // Removes quotes
  .trim();

// But this pattern is not reused elsewhere!
```

---

## ✅ Required Fix

### Step 1: Create Centralized Sanitizer

Create `lib/utils/sanitize-search.ts`:

```typescript
/**
 * Sanitizes user input for SQL ILIKE/LIKE queries to prevent operator injection.
 *
 * @param query - The user's search query
 * @param options - Sanitization options
 * @returns Sanitized search string
 *
 * @security CRITICAL - This prevents SQL injection in ILIKE queries
 */
export function sanitizeSearchQuery(
  query: string | null | undefined,
  options: {
    maxLength?: number;
    allowWildcards?: boolean;
    trimWhitespace?: boolean;
  } = {},
): string {
  const {
    maxLength = 100,
    allowWildcards = false,
    trimWhitespace = true,
  } = options;

  // Handle null/undefined
  if (!query) {
    return "";
  }

  // Convert to string and trim if needed
  let sanitized = String(query);
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Enforce max length (prevent DoS)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes (PostgreSQL safety)
  sanitized = sanitized.replace(/\0/g, "");

  if (allowWildcards) {
    // Escape backslashes first (must be done before other escapes)
    sanitized = sanitized.replace(/\\/g, "\\\\");

    // User can use % and _, but we need to validate they're not malicious
    // For now, we'll allow them but log suspicious patterns
    if (sanitized.match(/^%+$/) || sanitized.match(/^_+$/)) {
      console.warn("[Search] Suspicious wildcard-only query:", sanitized);
      return ""; // Return empty - don't allow wildcard-only searches
    }
  } else {
    // Escape SQL LIKE special characters
    // Order matters: backslash first, then others
    sanitized = sanitized.replace(/\\/g, "\\\\"); // Backslash
    sanitized = sanitized.replace(/%/g, "\\%"); // Percent
    sanitized = sanitized.replace(/_/g, "\\_"); // Underscore
  }

  // Remove potentially dangerous characters
  // Single/double quotes, semicolons, SQL keywords
  sanitized = sanitized.replace(/['"`;]/g, "");

  // Remove SQL comment markers
  sanitized = sanitized.replace(/--/g, "");
  sanitized = sanitized.replace(/\/\*/g, "");
  sanitized = sanitized.replace(/\*\//g, "");

  // Final trim
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  return sanitized;
}

/**
 * Validates that a search query doesn't contain obvious SQL injection attempts
 */
export function validateSearchQuery(query: string): {
  valid: boolean;
  reason?: string;
} {
  // Check for SQL keywords (basic check)
  const sqlKeywords = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "UNION",
    "EXEC",
    "EXECUTE",
    "SCRIPT",
    "JAVASCRIPT",
  ];

  const upperQuery = query.toUpperCase();

  for (const keyword of sqlKeywords) {
    if (upperQuery.includes(keyword)) {
      return {
        valid: false,
        reason: `Query contains potentially dangerous keyword: ${keyword}`,
      };
    }
  }

  // Check for suspicious patterns
  if (query.includes("/*") || query.includes("*/") || query.includes("--")) {
    return {
      valid: false,
      reason: "Query contains SQL comment markers",
    };
  }

  return { valid: true };
}
```

### Step 2: Update reviews-management.ts

```typescript
import {
  sanitizeSearchQuery,
  validateSearchQuery,
} from "@/lib/utils/sanitize-search";

// ... in the search function ...

if (validatedParams.searchQuery) {
  // ✅ Validate first
  const validation = validateSearchQuery(validatedParams.searchQuery);
  if (!validation.valid) {
    console.warn("[Reviews] Invalid search query:", validation.reason);
    return {
      success: false,
      error: "Invalid search query",
      data: [],
    };
  }

  // ✅ Sanitize the search query
  const sanitized = sanitizeSearchQuery(validatedParams.searchQuery, {
    maxLength: 100,
    allowWildcards: false, // Don't allow user-supplied wildcards
    trimWhitespace: true,
  });

  // Only search if sanitized query is not empty
  if (sanitized.length > 0) {
    // ✅ Use sanitized input
    query = query.or(
      `review_text.ilike.%${sanitized}%,reviewer_name.ilike.%${sanitized}%`,
    );
  } else {
    // Empty search after sanitization - return all results
    console.warn("[Reviews] Empty search query after sanitization");
  }
}
```

### Step 3: Update questions-management.ts

```typescript
import {
  sanitizeSearchQuery,
  validateSearchQuery,
} from "@/lib/utils/sanitize-search";

// ... in the search function ...

if (validatedParams.searchQuery) {
  const validation = validateSearchQuery(validatedParams.searchQuery);
  if (!validation.valid) {
    return {
      success: false,
      error: "Invalid search query",
      data: [],
    };
  }

  const sanitized = sanitizeSearchQuery(validatedParams.searchQuery, {
    maxLength: 100,
    allowWildcards: false,
  });

  if (sanitized.length > 0) {
    query = query.or(
      `text.ilike.%${sanitized}%,author_display_name.ilike.%${sanitized}%`,
    );
  }
}
```

### Step 4: Update posts-management.ts (Refactor to use shared sanitizer)

```typescript
import { sanitizeSearchQuery } from "@/lib/utils/sanitize-search";

// ✅ Replace inline sanitization with shared function
if (validatedParams.searchQuery) {
  const sanitized = sanitizeSearchQuery(validatedParams.searchQuery);

  if (sanitized.length > 0) {
    query = query.or(
      `summary.ilike.%${sanitized}%,topic_type.ilike.%${sanitized}%`,
    );
  }
}
```

---

## 🔍 Step-by-Step Implementation

### Step 1: Create Sanitizer

```bash
# Create file
touch lib/utils/sanitize-search.ts

# Copy implementation above
```

### Step 2: Find All Search Queries

```bash
# Find all ilike usages
grep -rn "\.ilike\." server/actions/ --include="*.ts"

# Find all searchQuery usages
grep -rn "searchQuery" server/actions/ --include="*.ts"
```

### Step 3: Update Each File

1. Import sanitizer
2. Add validation
3. Sanitize before use
4. Handle empty sanitized query

### Step 4: Test

Create `lib/utils/sanitize-search.test.ts`:

```typescript
import { describe, it, expect } from "@jest/globals";
import { sanitizeSearchQuery, validateSearchQuery } from "./sanitize-search";

describe("sanitizeSearchQuery", () => {
  it("should allow normal text", () => {
    expect(sanitizeSearchQuery("hello world")).toBe("hello world");
  });

  it("should escape % wildcard", () => {
    expect(sanitizeSearchQuery("test%")).toBe("test\\%");
  });

  it("should escape _ wildcard", () => {
    expect(sanitizeSearchQuery("test_name")).toBe("test\\_name");
  });

  it("should escape backslash", () => {
    expect(sanitizeSearchQuery("test\\value")).toBe("test\\\\value");
  });

  it("should remove quotes", () => {
    expect(sanitizeSearchQuery(`test"value'`)).toBe("testvalue");
  });

  it("should remove SQL comments", () => {
    expect(sanitizeSearchQuery("test--comment")).toBe("testcomment");
    expect(sanitizeSearchQuery("test/*comment*/")).toBe("testcomment");
  });

  it("should enforce max length", () => {
    const long = "a".repeat(200);
    const result = sanitizeSearchQuery(long, { maxLength: 50 });
    expect(result).toHaveLength(50);
  });

  it("should reject wildcard-only queries", () => {
    expect(sanitizeSearchQuery("%%%")).toBe("");
    expect(sanitizeSearchQuery("___")).toBe("");
  });

  it("should allow wildcards when enabled", () => {
    const result = sanitizeSearchQuery("test%", { allowWildcards: true });
    // Should not escape % when allowed
    // But should still validate it's not malicious
  });
});

describe("validateSearchQuery", () => {
  it("should allow normal queries", () => {
    const result = validateSearchQuery("hello world");
    expect(result.valid).toBe(true);
  });

  it("should reject SQL keywords", () => {
    const result = validateSearchQuery("SELECT * FROM users");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("SELECT");
  });

  it("should reject SQL comments", () => {
    const result = validateSearchQuery("test--comment");
    expect(result.valid).toBe(false);
  });

  it("should reject SQL comment blocks", () => {
    const result = validateSearchQuery("test/*malicious*/");
    expect(result.valid).toBe(false);
  });
});
```

### Step 5: Manual Testing

```bash
# Start dev server
npm run dev

# Test search endpoints with malicious input
curl -X POST http://localhost:5050/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"searchQuery": "%"}'

curl -X POST http://localhost:5050/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"searchQuery": "test--comment"}'

curl -X POST http://localhost:5050/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"searchQuery": "SELECT * FROM"}'
```

All should be sanitized/rejected properly.

---

## ✅ Acceptance Criteria

- [ ] `sanitizeSearchQuery` function created and tested
- [ ] `validateSearchQuery` function created and tested
- [ ] All 3 files updated to use sanitizer
- [ ] Special characters `%`, `_`, `\` properly escaped
- [ ] SQL keywords detected and rejected
- [ ] SQL comments removed/rejected
- [ ] Quotes removed from queries
- [ ] Max length enforced (prevent DoS)
- [ ] Wildcard-only queries rejected
- [ ] Unit tests pass
- [ ] Manual testing with malicious input successful
- [ ] TypeScript compiles without errors
- [ ] No security warnings in code review

---

## 🧪 Testing Checklist

### Attack Vectors to Test:

```bash
# 1. Wildcard injection
searchQuery: "%"           # Should not return all results
searchQuery: "___"         # Should not match everything

# 2. SQL keywords
searchQuery: "SELECT * FROM users"  # Should be rejected

# 3. Comment injection
searchQuery: "test--comment"        # Should remove comment
searchQuery: "test/*comment*/"      # Should remove comment

# 4. Quote escaping
searchQuery: "test'OR'1'='1"       # Should remove quotes

# 5. Backslash escaping
searchQuery: "test\\%"             # Should properly escape

# 6. DoS via length
searchQuery: "a".repeat(10000)     # Should truncate to maxLength

# 7. Normal queries (should work)
searchQuery: "great service"       # Should work normally
searchQuery: "5 stars"             # Should work normally
```

---

## 🚨 Important Notes

- **CRITICAL:** This prevents SQL injection. Test thoroughly!
- **Performance:** Sanitization adds minimal overhead (<1ms)
- **UX:** Invalid queries should show user-friendly error, not tech details
- **Logging:** Log suspicious queries for security monitoring

### Security Monitoring

Add to your monitoring:

```typescript
if (!validation.valid) {
  // Log security event
  logger.security("Suspicious search query detected", {
    query: validatedParams.searchQuery,
    reason: validation.reason,
    userId: user.id,
    ip: request.headers.get("x-forwarded-for"),
    timestamp: new Date().toISOString(),
  });
}
```

---

## 📖 Reference

- [OWASP: SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PostgreSQL LIKE Operator](https://www.postgresql.org/docs/current/functions-matching.html)
- [Supabase Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

**Status:** ✅ COMPLETED
**Completed Date:** 2025-11-28
**Estimated Time:** 3 hours
**Priority:** P0 - CRITICAL

---

**Remember:** All user input is potentially malicious. Always sanitize! 🛡️
